import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { PayableInstallmentsManager } from '../domain';
import { UpdatePayableDto } from '../dto/payable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { parseDateOnly } from '../../../shared/utils/date.utils';
import { CacheService } from '../../../shared/services/cache.service';
import { AccountStatus } from '@prisma/client';

/**
 * Use Case: Atualizar uma conta a pagar existente
 * Responsabilidade: orquestrar atualização e recalcular parcelas se necessário
 */
@Injectable()
export class UpdatePayableUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly installmentsManager: PayableInstallmentsManager,
    private readonly cacheService: CacheService
  ) {}

  async execute(id: string, organizationId: string, dto: UpdatePayableDto) {
    // Buscar conta existente
    const existingPayable = await this.payablesRepository.findFirst(
      { id, organizationId },
      {
        installments: {
          select: {
            id: true,
            dueDate: true,
            status: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      } as any
    );

    if (!existingPayable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    const { tagIds, ...updateData } = dto;

    // Verificar se o valor realmente mudou
    const currentAmount = Number(existingPayable.amount);
    const newAmount = updateData.amount
      ? Number(updateData.amount)
      : currentAmount;
    const amountChanged =
      updateData.amount !== undefined &&
      Math.abs(currentAmount - newAmount) > 0.001;

    // Validar se possui parcelas pagas ao tentar mudar valor
    if (amountChanged) {
      const hasPayments = (existingPayable as any).installments.some(
        (inst: any) =>
          inst.status === AccountStatus.PAID ||
          inst.status === AccountStatus.PARTIAL
      );

      if (hasPayments) {
        throw new BadRequestException(
          'Não é possível alterar o valor de uma conta que já possui pagamentos'
        );
      }
    }

    // Flags para operações
    const installments = (existingPayable as any).installments;
    const dueDateChanged = updateData.dueDate !== undefined;
    const shouldRecalculateInstallments =
      amountChanged && installments.length > 0;
    const shouldUpdateDueDates =
      dueDateChanged &&
      installments.length > 0 &&
      !shouldRecalculateInstallments; // Não atualizar datas se já recalculou parcelas

    // Atualizar em transação
    const result = await this.payablesRepository.transaction(async tx => {
      // 1. Atualizar dados principais
      const updated = await tx.payable.update({
        where: { id },
        data: {
          ...(updateData.vendorId && { vendorId: updateData.vendorId }),
          ...(updateData.categoryId !== undefined && {
            categoryId: updateData.categoryId || null,
          }),
          ...(updateData.amount && {
            amount: MoneyUtils.toDecimal(updateData.amount),
          }),
          ...(updateData.invoiceNumber !== undefined && {
            documentNumber: updateData.invoiceNumber,
          }),
          ...(updateData.dueDate && {
            dueDate: parseDateOnly(updateData.dueDate),
          }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
        },
      });

      // 2. Recalcular parcelas se o valor mudou
      if (shouldRecalculateInstallments && updateData.amount !== undefined) {
        const dueDates = installments.map((inst: any) =>
          inst.dueDate.toISOString()
        );
        await this.installmentsManager.recalculateInstallments(
          id,
          organizationId,
          updateData.amount,
          installments.length,
          dueDates
        );
      }

      // 3. Atualizar datas se a data de vencimento mudou (mas valor não mudou)
      if (shouldUpdateDueDates && updateData.dueDate !== undefined) {
        await this.installmentsManager.updateInstallmentDates(
          id,
          parseDateOnly(updateData.dueDate),
          installments
        );
      }

      // 4. Atualizar tags
      if (tagIds !== undefined) {
        await tx.payableTag.deleteMany({ where: { payableId: id } });
        if (tagIds.length > 0) {
          await tx.payableTag.createMany({
            data: tagIds.map(tagId => ({ payableId: id, tagId })),
          });
        }
      }

      return updated;
    });

    // Invalidar cache
    this.cacheService.del(`dashboard:summary:${organizationId}`);

    return result;
  }
}
