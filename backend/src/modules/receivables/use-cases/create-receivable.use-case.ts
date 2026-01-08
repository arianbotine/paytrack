import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, AccountStatus } from '@prisma/client';
import {
  ReceivablesRepository,
  ReceivableInstallmentsRepository,
} from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';
import { CreateReceivableDto } from '../dto/receivable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { generateInstallments } from '../../../shared/utils/account.utils';

/**
 * Use Case: Criar Receivable
 * Responsabilidade: Orquestrar criação de receivable com parcelas e tags
 */
@Injectable()
export class CreateReceivableUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly installmentsRepository: ReceivableInstallmentsRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(organizationId: string, dto: CreateReceivableDto) {
    const { installmentCount = 1, dueDates, tagIds, ...baseData } = dto;

    // Validação: dueDates deve ter o mesmo tamanho que installmentCount
    if (dueDates.length !== installmentCount) {
      throw new BadRequestException(
        `dueDates deve conter exatamente ${installmentCount} datas`
      );
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

      // 3. Retornar receivable com includes
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
}
