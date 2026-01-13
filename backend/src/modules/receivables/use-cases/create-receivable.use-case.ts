import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, AccountStatus } from '@prisma/client';
import {
  ReceivablesRepository,
  ReceivableInstallmentsRepository,
} from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';
import { CreateReceivableDto } from '../dto/receivable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { generateInstallments } from '../../../shared/utils/account.utils';
import { CreatePaymentUseCase } from '../../payments/use-cases/create-payment.use-case';
import { parseDatetime } from '../../../shared/utils/date.utils';

/**
 * Use Case: Criar Receivable
 * Responsabilidade: Orquestrar criação de receivable com parcelas e tags
 */
@Injectable()
export class CreateReceivableUseCase {
  private readonly logger = new Logger(CreateReceivableUseCase.name);

  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly installmentsRepository: ReceivableInstallmentsRepository,
    private readonly cacheService: CacheService,
    private readonly createPaymentUseCase: CreatePaymentUseCase
  ) {}

  async execute(organizationId: string, dto: CreateReceivableDto) {
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

    // Criar receivable + parcelas em transação
    const result = await this.repository.transaction(async tx => {
      // 1. Criar receivable principal
      const receivable = await tx.receivable.create({
        data: {
          organizationId,
          customerId: baseData.customerId,
          categoryId: baseData.categoryId,
          amount: MoneyUtils.toDecimal(baseData.amount),
          notes: baseData.notes,
          totalInstallments: installmentCount,
          status: AccountStatus.PENDING,
          ...(tagIds && tagIds.length > 0
            ? {
                tags: {
                  create: tagIds.map((tagId: string) => ({ tagId })),
                },
              }
            : {}),
        },
      });

      // 2. Criar parcelas usando generateInstallments
      const installmentsData = generateInstallments(
        baseData.amount,
        installmentCount,
        dueDates,
        receivable.id,
        organizationId,
        'receivable'
      ) as Prisma.ReceivableInstallmentCreateManyInput[];

      await tx.receivableInstallment.createMany({
        data: installmentsData,
      });

      // 3. Registrar pagamento, se fornecido
      if (payment) {
        await this.registerPaymentOnCreation(
          tx,
          organizationId,
          receivable.id,
          payment,
          installmentsData
        );
      }

      // 4. Retornar receivable com includes
      return tx.receivable.findUnique({
        where: { id: receivable.id },
        include: {
          customer: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
      });
    });

    // Invalidar cache do dashboard
    this.cacheService?.del(`dashboard:summary:${organizationId}`);

    return MoneyUtils.transformMoneyFields(result!, [
      'amount',
      'receivedAmount',
    ]);
  }

  /**
   * Valida os dados de pagamento durante a criação
   */
  private validatePaymentOnCreation(
    payment: CreateReceivableDto['payment'],
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
      throw new BadRequestException('Data do recebimento não pode ser futura');
    }
  }

  /**
   * Registra o pagamento das parcelas selecionadas
   */
  private async registerPaymentOnCreation(
    tx: any,
    organizationId: string,
    receivableId: string,
    payment: NonNullable<CreateReceivableDto['payment']>,
    installments: any[]
  ): Promise<void> {
    // Buscar parcelas criadas pelos números
    const selectedInstallments = await tx.receivableInstallment.findMany({
      where: {
        receivableId,
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
      (sum, inst) => sum + Number(inst.amount),
      0
    );

    this.logger.log(
      `Registrando recebimento de ${totalAmount} para ${selectedInstallments.length} parcelas da conta ${receivableId}`
    );

    // Criar alocações para cada parcela selecionada
    const allocations = selectedInstallments.map(inst => ({
      receivableInstallmentId: inst.id,
      amount: Number(inst.amount),
    }));

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
