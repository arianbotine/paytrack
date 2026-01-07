import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceivablesRepository } from '../repositories';
import { ReceivableInstallmentsManager } from '../domain';
import { CacheService } from '../../../shared/services/cache.service';
import { UpdateReceivableDto } from '../dto/receivable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { parseDateOnly } from '../../../shared/utils/date.utils';
import { generateInstallments } from '../../../shared/utils/account.utils';

/**
 * Use Case: Atualizar Receivable
 * Responsabilidade: Orquestrar atualização de receivable com validações e recálculos
 */
@Injectable()
export class UpdateReceivableUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly installmentsManager: ReceivableInstallmentsManager,
    private readonly cacheService: CacheService
  ) {}

  async execute(id: string, organizationId: string, dto: UpdateReceivableDto) {
    const { tagIds, ...data } = dto;

    // Buscar receivable com parcelas
    const receivable = (await this.repository.findFirst(
      { id, organizationId },
      {
        installments: {
          include: { allocations: true },
          orderBy: { installmentNumber: 'asc' },
        },
      }
    )) as any;

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const { customerId, categoryId, ...updateData } = data;

    // Validar se pode editar o valor
    const hasAnyPayment = (receivable.installments as any[]).some(
      (inst: any) => inst.allocations && inst.allocations.length > 0
    );

    const currentAmount = Number(receivable.amount);
    const newAmount = data.amount ? Number(data.amount) : currentAmount;
    const amountChanged =
      data.amount !== undefined && Math.abs(currentAmount - newAmount) > 0.001;

    if (amountChanged && hasAnyPayment) {
      throw new BadRequestException(
        'Não é possível alterar o valor de uma conta que já possui recebimentos registrados. Cancele os recebimentos para editar o valor.'
      );
    }

    // Flags para operações
    const shouldRecalculateInstallments =
      amountChanged && !hasAnyPayment && receivable.installments.length > 0;
    const shouldUpdateDueDates =
      data.dueDate &&
      receivable.installments.length > 1 &&
      !shouldRecalculateInstallments;

    // Executar em transação
    const updated = await this.repository.transaction(async tx => {
      // 1. Recalcular parcelas se valor mudou
      if (shouldRecalculateInstallments) {
        const existingDueDates = receivable.installments.map((inst: any) => {
          const date = new Date(inst.dueDate);
          return date.toISOString().split('T')[0];
        });

        await tx.receivableInstallment.deleteMany({
          where: { receivableId: id },
        });

        const newInstallments = generateInstallments(
          newAmount,
          receivable.installments.length,
          existingDueDates,
          id,
          organizationId,
          'receivable'
        ) as Prisma.ReceivableInstallmentCreateManyInput[];

        await tx.receivableInstallment.createMany({
          data: newInstallments,
        });
      }

      // 2. Atualizar datas de vencimento se mudou
      if (shouldUpdateDueDates) {
        const newDueDate = parseDateOnly(data.dueDate!);
        await this.installmentsManager.updateDueDates(
          id,
          newDueDate,
          receivable.installments,
          tx
        );
      }

      // 3. Atualizar receivable
      return tx.receivable.update({
        where: { id },
        data: {
          ...updateData,
          ...(updateData.amount !== undefined && {
            amount: MoneyUtils.toDecimal(updateData.amount),
          }),
          ...(data.dueDate && { dueDate: parseDateOnly(data.dueDate) }),
          ...(customerId && { customer: { connect: { id: customerId } } }),
          ...(categoryId !== undefined && {
            category:
              categoryId && categoryId !== ''
                ? { connect: { id: categoryId } }
                : { disconnect: true },
          }),
          ...(tagIds && {
            tags: {
              deleteMany: {},
              create: tagIds.map(tagId => ({ tagId })),
            },
          }),
        },
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

    // Invalidar cache
    this.cacheService?.del(`dashboard:summary:${organizationId}`);

    return MoneyUtils.transformMoneyFields(updated, [
      'amount',
      'receivedAmount',
    ]);
  }
}
