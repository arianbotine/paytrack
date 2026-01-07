import { Injectable, BadRequestException } from '@nestjs/common';
import {
  PayablesRepository,
  PayableInstallmentsRepository,
} from '../repositories';
import { InstallmentsCalculator } from '../domain';
import { CreatePayableDto } from '../dto/payable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { parseDateOnly } from '../../../shared/utils/date.utils';
import { CacheService } from '../../../shared/services/cache.service';

/**
 * Use Case: Criar uma nova conta a pagar
 * Responsabilidade única: orquestrar a criação de payable com suas parcelas
 */
@Injectable()
export class CreatePayableUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly installmentsRepository: PayableInstallmentsRepository,
    private readonly calculator: InstallmentsCalculator,
    private readonly cacheService: CacheService
  ) {}

  async execute(organizationId: string, dto: CreatePayableDto) {
    const { installmentCount = 1, dueDates, tagIds, ...baseData } = dto;

    // Validação: dueDates obrigatório quando installmentCount > 1
    if (installmentCount > 1 && (!dueDates || dueDates.length === 0)) {
      throw new BadRequestException(
        'dueDates é obrigatório quando installmentCount > 1'
      );
    }

    // Validação: dueDates deve ter o mesmo tamanho que installmentCount
    if (dueDates && dueDates.length !== installmentCount) {
      throw new BadRequestException(
        `dueDates deve conter exatamente ${installmentCount} datas`
      );
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
          documentNumber: baseData.invoiceNumber,
          dueDate: parseDateOnly(baseData.dueDate),
          notes: baseData.notes,
        },
      });

      // 2. Gerar e criar parcelas
      const installments = this.calculator.generateInstallments(
        baseData.amount,
        installmentCount,
        dueDates || [baseData.dueDate],
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

      return payable;
    });

    // Invalidar cache do dashboard
    this.cacheService.del(`dashboard:summary:${organizationId}`);

    return result;
  }
}
