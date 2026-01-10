import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReceivablesRepository } from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { ReceivableStatus } from '../domain/receivable-status.enum';

/**
 * Use Case: Excluir Parcela de Receivable
 * Responsabilidade: Excluir parcela pendente e renumerar as restantes
 */
@Injectable()
export class DeleteReceivableInstallmentUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(
    receivableId: string,
    installmentId: string,
    organizationId: string
  ) {
    const receivable = await this.repository.findFirst(
      { id: receivableId, organizationId },
      {
        installments: {
          include: {
            allocations: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      }
    );

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Type assertion necessária porque Prisma não infere includes automaticamente
    const receivableWithInstallments = receivable as typeof receivable & {
      installments: Array<{
        id: string;
        status: ReceivableStatus;
        allocations: any[];
      }>;
    };

    if (receivableWithInstallments.installments.length === 1) {
      throw new BadRequestException(
        'Não é possível excluir a única parcela da conta. Exclua a conta inteira.'
      );
    }

    const installmentToDelete = receivableWithInstallments.installments.find(
      i => i.id === installmentId
    );

    if (!installmentToDelete) {
      throw new NotFoundException('Parcela não encontrada');
    }

    if (installmentToDelete.status !== ReceivableStatus.PENDING) {
      throw new BadRequestException('Só é possível excluir parcelas pendentes');
    }

    if (installmentToDelete.allocations.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir parcela com pagamentos registrados'
      );
    }

    await this.repository.transaction(async prisma => {
      // 1. Deletar parcela
      await prisma.receivableInstallment.delete({
        where: { id: installmentId },
      });

      // 2. Buscar parcelas restantes
      const remainingInstallments = await prisma.receivableInstallment.findMany(
        {
          where: { receivableId },
          orderBy: { installmentNumber: 'asc' },
          include: {
            allocations: true,
          },
        }
      );

      // 3. Renumerar parcelas restantes
      for (let i = 0; i < remainingInstallments.length; i++) {
        await prisma.receivableInstallment.update({
          where: { id: remainingInstallments[i].id },
          data: {
            installmentNumber: i + 1,
            totalInstallments: remainingInstallments.length,
          },
        });
      }

      // 4. Recalcular valor total somando parcelas restantes (auto-corretivo)
      const newTotalAmount = remainingInstallments.reduce(
        (sum, inst) => sum + Number(inst.amount),
        0
      );

      // 5. Recalcular status da conta baseado nas parcelas restantes
      const totalPaid = remainingInstallments.reduce((sum, inst) => {
        const installmentPaid = inst.allocations.reduce(
          (allocSum: number, alloc: any) => allocSum + Number(alloc.amount),
          0
        );
        return sum + installmentPaid;
      }, 0);

      let newStatus: ReceivableStatus;
      if (totalPaid >= newTotalAmount - 0.01) {
        newStatus = ReceivableStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = ReceivableStatus.PARTIAL;
      } else {
        newStatus = ReceivableStatus.PENDING;
      }

      // 6. Atualizar receivable com novo total e status
      await prisma.receivable.update({
        where: { id: receivableId },
        data: {
          totalInstallments: remainingInstallments.length,
          amount: MoneyUtils.toDecimal(newTotalAmount),
          status: newStatus,
        },
      });
    });

    this.invalidateDashboardCache(organizationId);

    return this.repository.findFirst(
      { id: receivableId, organizationId },
      {
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
      }
    );
  }

  private invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    this.cacheService.del(cacheKey);
  }
}
