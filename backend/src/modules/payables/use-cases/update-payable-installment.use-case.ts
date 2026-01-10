import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { AccountStatus } from '@prisma/client';
import { CacheService } from '../../../shared/services/cache.service';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { UpdateInstallmentDto } from '../dto/payable.dto';
import { PayableStatus } from '../domain/payable-status.enum';

/**
 * Use Case: Atualizar Parcela de Payable
 * Responsabilidade: Atualizar valor de parcela pendente
 */
@Injectable()
export class UpdatePayableInstallmentUseCase {
  constructor(
    private readonly repository: PayablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    organizationId: string,
    updateDto: UpdateInstallmentDto
  ) {
    const payable = await this.repository.findFirst(
      { id: payableId, organizationId },
      {
        installments: {
          include: {
            allocations: true,
          },
        },
      }
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Type assertion necessária porque Prisma não infere includes automaticamente
    const payableWithInstallments = payable as typeof payable & {
      installments: Array<{
        id: string;
        amount: number;
        dueDate: Date;
        status: AccountStatus;
        allocations: any[];
      }>;
    };

    const installmentToUpdate = payableWithInstallments.installments.find(
      inst => inst.id === installmentId
    );

    if (!installmentToUpdate) {
      throw new NotFoundException('Parcela não encontrada');
    }

    // Validação condicional: amount/dueDate requerem PENDING sem pagamentos
    // notes/tagIds podem ser editados sempre
    const isEditingAmount =
      updateDto.amount !== undefined &&
      Number(updateDto.amount) !== Number(installmentToUpdate.amount);
    const isEditingDueDate =
      updateDto.dueDate !== undefined &&
      updateDto.dueDate !==
        installmentToUpdate.dueDate.toISOString().split('T')[0];

    const isEditingAmountOrDate = isEditingAmount || isEditingDueDate;

    if (isEditingAmountOrDate) {
      if (installmentToUpdate.status !== PayableStatus.PENDING) {
        throw new BadRequestException(
          'Só é possível editar valor e data de vencimento de parcelas pendentes'
        );
      }

      if (installmentToUpdate.allocations.length > 0) {
        throw new BadRequestException(
          'Não é possível editar valor e data de vencimento de parcela com pagamentos registrados'
        );
      }
    }

    // Atualizar parcela e recalcular total somando todas as parcelas (auto-corretivo)
    await this.repository.transaction(async prisma => {
      // 1. Atualizar parcela (valor, data de vencimento, observações)
      const updateData: {
        amount?: any;
        dueDate?: Date;
        notes?: string | null;
      } = {};

      if (updateDto.amount !== undefined) {
        updateData.amount = MoneyUtils.toDecimal(updateDto.amount);
      }

      if (updateDto.dueDate && updateDto.dueDate.trim() !== '') {
        const dateValue = new Date(updateDto.dueDate + 'T12:00:00.000Z');
        if (Number.isNaN(dateValue.getTime())) {
          throw new BadRequestException('Data de vencimento inválida');
        }
        updateData.dueDate = dateValue;
      }

      if (updateDto.notes !== undefined) {
        updateData.notes = updateDto.notes.trim() || null;
      }

      await prisma.payableInstallment.update({
        where: { id: installmentId },
        data: updateData,
      });

      // 2. Atualizar tags da parcela (se fornecidas)
      if (updateDto.tagIds !== undefined) {
        // Deletar todas as tags existentes
        await prisma.payableInstallmentTag.deleteMany({
          where: { payableInstallmentId: installmentId },
        });

        // Criar novas tags
        if (updateDto.tagIds.length > 0) {
          await prisma.payableInstallmentTag.createMany({
            data: updateDto.tagIds.map(tagId => ({
              payableInstallmentId: installmentId,
              tagId,
            })),
          });
        }
      }

      // 3. Se alterou a data de vencimento, reordenar e renumerar parcelas
      if (updateDto.dueDate) {
        // Buscar todas as parcelas ordenadas por data de vencimento
        const allInstallments = await prisma.payableInstallment.findMany({
          where: { payableId },
          orderBy: { dueDate: 'asc' },
        });

        // Renumerar parcelas de acordo com a ordem de vencimento
        for (let i = 0; i < allInstallments.length; i++) {
          await prisma.payableInstallment.update({
            where: { id: allInstallments[i].id },
            data: { installmentNumber: i + 1 },
          });
        }
      }

      // 4. Se alterou valor, recalcular total
      if (updateDto.amount !== undefined) {
        // Buscar todas as parcelas atualizadas
        const allInstallments = await prisma.payableInstallment.findMany({
          where: { payableId },
        });

        // Recalcular valor total somando todas as parcelas
        const newTotalAmount = allInstallments.reduce(
          (sum, inst) => sum + Number(inst.amount),
          0
        );

        // Atualizar payable com novo total
        await prisma.payable.update({
          where: { id: payableId },
          data: {
            amount: MoneyUtils.toDecimal(newTotalAmount),
          },
        });
      }
    });

    this.invalidateDashboardCache(organizationId);

    return this.repository.findFirst(
      { id: payableId, organizationId },
      {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        installments: {
          include: {
            tags: {
              include: {
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
          orderBy: { installmentNumber: 'asc' },
        },
      }
    );
  }

  private invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    this.cacheService.del(cacheKey);
  }
}
