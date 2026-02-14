import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  PayablesRepository,
  PayableInstallmentsRepository,
} from '../repositories';
import { InstallmentsCalculator } from '../domain';
import { CreatePayableDto } from '../dto/payable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { CacheService } from '../../../shared/services/cache.service';
import { CreatePaymentUseCase } from '../../payments/use-cases/create-payment.use-case';
import { parseDatetime } from '../../../shared/utils/date.utils';

/**
 * Use Case: Criar uma nova conta a pagar
 * Responsabilidade única: orquestrar a criação de payable com suas parcelas
 */
@Injectable()
export class CreatePayableUseCase {
  private readonly logger = new Logger(CreatePayableUseCase.name);

  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly installmentsRepository: PayableInstallmentsRepository,
    private readonly calculator: InstallmentsCalculator,
    private readonly cacheService: CacheService,
    private readonly createPaymentUseCase: CreatePaymentUseCase
  ) {}

  async execute(organizationId: string, dto: CreatePayableDto) {
    const {
      installmentCount = 1,
      dueDates,
      tagIds,
      payment,
      ...baseData
    } = dto;

    // Validação: dueDates deve ter o mesmo tamanho que installmentCount
    if (dueDates.length !== installmentCount) {
      throw new BadRequestException(
        `dueDates deve conter exatamente ${installmentCount} datas`
      );
    }

    // Validar pagamento, se fornecido
    if (payment) {
      this.validatePaymentOnCreation(payment, installmentCount);
    }

    // Criar conta + parcelas em transação
    const result = await this.payablesRepository.transaction(async tx => {
      // 1. Criar conta principal
      const payable = await tx.payable.create({
        data: {
          organizationId,
          vendorId: baseData.vendorId,
          categoryId: baseData.categoryId,
          amount: MoneyUtils.toDecimal(baseData.amount),
          notes: baseData.notes,
        },
      });

      // 2. Gerar e criar parcelas
      const installments = this.calculator.generateInstallments(
        baseData.amount,
        installmentCount,
        dueDates,
        payable.id,
        organizationId,
        'payable'
      );

      await tx.payableInstallment.createMany({
        data: installments as any,
      });

      // 3. Associar tags, se fornecidas
      if (tagIds && tagIds.length > 0) {
        await tx.payableTag.createMany({
          data: tagIds.map(tagId => ({
            payableId: payable.id,
            tagId,
          })),
        });
      }

      // 4. Registrar pagamento, se fornecido
      if (payment) {
        await this.registerPaymentOnCreation(
          tx,
          organizationId,
          payable.id,
          payment
        );
      }

      return payable;
    });

    // Invalidar cache do dashboard
    this.cacheService.del(`dashboard:summary:${organizationId}`);

    return result;
  }

  /**
   * Valida os dados de pagamento durante a criação
   */
  private validatePaymentOnCreation(
    payment: CreatePayableDto['payment'],
    totalInstallments: number
  ): void {
    if (!payment) return;

    const { installmentNumbers } = payment;

    // Validar range dos números de parcelas
    const invalidNumbers = installmentNumbers.filter(
      num => num < 1 || num > totalInstallments
    );
    if (invalidNumbers.length > 0) {
      throw new BadRequestException(
        `Números de parcela inválidos: ${invalidNumbers.join(', ')}. Deve estar entre 1 e ${totalInstallments}`
      );
    }

    // Validar parcelas duplicadas
    const uniqueNumbers = new Set(installmentNumbers);
    if (uniqueNumbers.size !== installmentNumbers.length) {
      throw new BadRequestException(
        'Existem números de parcela duplicados na seleção'
      );
    }

    // Validar data do pagamento (deve ser <= hoje)
    const paymentDate = parseDatetime(payment.paymentDate);
    const now = new Date();
    if (paymentDate > now) {
      throw new BadRequestException('Data do pagamento não pode ser futura');
    }
  }

  /**
   * Registra o pagamento das parcelas selecionadas
   */
  private async registerPaymentOnCreation(
    tx: any,
    organizationId: string,
    payableId: string,
    payment: NonNullable<CreatePayableDto['payment']>
  ): Promise<void> {
    // Buscar parcelas criadas pelos números
    const selectedInstallments = await tx.payableInstallment.findMany({
      where: {
        payableId,
        installmentNumber: { in: payment.installmentNumbers },
      },
    });

    // Validar que todas as parcelas foram encontradas
    if (selectedInstallments.length !== payment.installmentNumbers.length) {
      throw new BadRequestException(
        'Algumas parcelas selecionadas não foram encontradas'
      );
    }

    // Calcular valor total do pagamento (soma das parcelas selecionadas)
    const totalAmount = selectedInstallments.reduce(
      (sum: number, inst: (typeof selectedInstallments)[number]) =>
        sum + Number(inst.amount),
      0
    );

    this.logger.log(
      `Registrando pagamento de ${totalAmount} para ${selectedInstallments.length} parcelas da conta ${payableId}`
    );

    // Criar alocações para cada parcela selecionada
    const allocations = selectedInstallments.map(
      (inst: (typeof selectedInstallments)[number]) => ({
        payableInstallmentId: inst.id,
        amount: Number(inst.amount),
      })
    );

    // Delegar para CreatePaymentUseCase com a transação
    await this.createPaymentUseCase.executeInTransaction(tx, organizationId, {
      amount: totalAmount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      reference: payment.reference,
      allocations,
    });
  }
}
