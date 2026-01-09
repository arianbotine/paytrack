import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { AccountStatus } from '@prisma/client';
import { CacheService } from '../../../shared/services/cache.service';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { InstallmentsCalculator } from '../domain';
import { PayableStatus } from '../domain/payable-status.enum';

/**
 * Use Case: Excluir Parcela de Payable
 * Responsabilidade: Excluir parcela pendente e renumerar as restantes
 */
@Injectable()
export class DeletePayableInstallmentUseCase {
  constructor(
    private readonly repository: PayablesRepository,
    private readonly cacheService: CacheService,
    private readonly calculator: InstallmentsCalculator
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    organizationId: string
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
        installmentNumber: number;
        status: AccountStatus;
        allocations: any[];
      }>;
    };

    // Ordenar installments manualmente pois repository não suporta orderBy em include
    payableWithInstallments.installments.sort(
      (a, b) => a.installmentNumber - b.installmentNumber
    );

    if (payableWithInstallments.installments.length === 1) {
      throw new BadRequestException(
        'Não é possível excluir a única parcela da conta. Exclua a conta inteira.'
      );
    }

    const installmentToDelete = payableWithInstallments.installments.find(
      i => i.id === installmentId
    );

    if (!installmentToDelete) {
      throw new NotFoundException('Parcela não encontrada');
    }

    if (installmentToDelete.status !== PayableStatus.PENDING) {
      throw new BadRequestException('Só é possível excluir parcelas pendentes');
    }

    if (installmentToDelete.allocations.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir parcela com pagamentos registrados'
      );
    }

    await this.repository.transaction(async prisma => {
      // 1. Deletar parcela
      await prisma.payableInstallment.delete({
        where: { id: installmentId },
      });

      // 2. Buscar parcelas restantes
      const remainingInstallments = await prisma.payableInstallment.findMany({
        where: { payableId },
        orderBy: { installmentNumber: 'asc' },
        select: {
          id: true,
          installmentNumber: true,
          totalInstallments: true,
          amount: true,
          paidAmount: true,
        },
      });

      // 3. Renumerar parcelas restantes
      for (let i = 0; i < remainingInstallments.length; i++) {
        await prisma.payableInstallment.update({
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
      const totalPaid = remainingInstallments.reduce(
        (sum, inst) => sum + Number(inst.paidAmount),
        0
      );
      const newStatus = this.calculator.calculateStatus(
        newTotalAmount,
        totalPaid
      );

      // 6. Atualizar payable com novo total e status
      await prisma.payable.update({
        where: { id: payableId },
        data: {
          totalInstallments: remainingInstallments.length,
          amount: MoneyUtils.toDecimal(newTotalAmount),
          status: newStatus,
        },
      });
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
          orderBy: { installmentNumber: 'asc' },
        },
      }
    );
  }

  private invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:${organizationId}`;
    this.cacheService.del(cacheKey);
  }
}
