import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, ReceivableInstallment } from '@prisma/client';
import { ReceivableInstallmentsRepository } from '../repositories';

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
  calculateAccountStatus(installments: InstallmentWithStatus[]): AccountStatus {
    const allPaid = installments.every(
      inst => inst.status === AccountStatus.PAID
    );
    const anyPaid = installments.some(
      inst =>
        inst.status === AccountStatus.PAID ||
        inst.status === AccountStatus.PARTIAL
    );
    const anyOverdue = installments.some(
      inst => inst.status === AccountStatus.OVERDUE
    );

    if (allPaid) {
      return AccountStatus.PAID;
    } else if (anyPaid) {
      return AccountStatus.PARTIAL;
    } else if (anyOverdue) {
      return AccountStatus.OVERDUE;
    } else {
      return AccountStatus.PENDING;
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
