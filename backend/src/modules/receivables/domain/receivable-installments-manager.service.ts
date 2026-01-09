import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, ReceivableInstallment } from '@prisma/client';
import { ReceivableInstallmentsRepository } from '../repositories';
import { ReceivableStatus } from './receivable-status.enum';

type InstallmentWithStatus = Pick<
  ReceivableInstallment,
  'status' | 'amount' | 'receivedAmount' | 'id' | 'dueDate'
>;

/**
 * Domain Service para gerenciar parcelas de receivables
 * Responsabilidade: Lógica de negócio de parcelas (renumeração, atualização de status)
 */
@Injectable()
export class ReceivableInstallmentsManager {
  constructor(
    private readonly installmentsRepository: ReceivableInstallmentsRepository
  ) {}

  /**
   * Recalcula o status da conta baseado nas parcelas
   */
  calculateAccountStatus(
    installments: InstallmentWithStatus[]
  ): ReceivableStatus {
    const allPaid = installments.every(
      inst => inst.status === ReceivableStatus.PAID
    );
    const anyPaid = installments.some(
      inst =>
        inst.status === ReceivableStatus.PAID ||
        inst.status === ReceivableStatus.PARTIAL
    );

    if (allPaid) {
      return ReceivableStatus.PAID;
    } else if (anyPaid) {
      return ReceivableStatus.PARTIAL;
    } else {
      return ReceivableStatus.PENDING;
    }
  }

  /**
   * Renumera parcelas após exclusão
   */
  async renumberInstallments(
    installments: Pick<ReceivableInstallment, 'id'>[],
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const newTotalInstallments = installments.length;

    await Promise.all(
      installments.map((inst, index) =>
        tx.receivableInstallment.update({
          where: { id: inst.id },
          data: {
            installmentNumber: index + 1,
            totalInstallments: newTotalInstallments,
          },
        })
      )
    );
  }

  /**
   * Recalcula totais (amount e receivedAmount) das parcelas
   */
  calculateTotals(
    installments: Pick<ReceivableInstallment, 'amount' | 'receivedAmount'>[]
  ): {
    totalAmount: Prisma.Decimal;
    totalReceived: Prisma.Decimal;
  } {
    const totalAmount = installments.reduce(
      (sum, inst) => sum.plus(inst.amount),
      new Prisma.Decimal(0)
    );
    const totalReceived = installments.reduce(
      (sum, inst) => sum.plus(inst.receivedAmount),
      new Prisma.Decimal(0)
    );

    return { totalAmount, totalReceived };
  }
}
