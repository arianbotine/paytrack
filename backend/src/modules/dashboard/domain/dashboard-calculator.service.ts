import { Injectable } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type GroupedInstallment = {
  _sum: {
    amount: Decimal | null;
    paidAmount?: Decimal | null;
    receivedAmount?: Decimal | null;
  };
  _count: number;
  status: AccountStatus;
};

type Totals = {
  total: number;
  paid: number;
  pending: number;
  partial: number;
  overdue: number;
  count: number;
};

/**
 * Domain Service para cálculos de totais do dashboard
 * Responsabilidade: Lógica pura de agregação e cálculos
 */
@Injectable()
export class DashboardCalculator {
  /**
   * Calcula totais baseado em parcelas agrupadas por status
   */
  calculateTotals(grouped: GroupedInstallment[]): Totals {
    const totals: Totals = {
      total: 0,
      paid: 0,
      pending: 0,
      partial: 0,
      overdue: 0,
      count: 0,
    };

    for (const group of grouped) {
      const amount = this.safeNumber(group._sum.amount);
      const paidAmount = this.safeNumber(
        group._sum.paidAmount || group._sum.receivedAmount
      );
      const remaining = amount - paidAmount;

      totals.count += group._count;
      totals.total += amount;

      switch (group.status) {
        case AccountStatus.PAID:
          totals.paid += amount;
          break;
        case AccountStatus.PENDING:
          totals.pending += remaining;
          break;
        case AccountStatus.PARTIAL:
          totals.partial += remaining;
          break;
      }
    }

    return totals;
  }

  private safeNumber(value: Decimal | null | undefined): number {
    if (value == null) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Calcula saldo líquido (a receber - a pagar)
   */
  calculateNetBalance(toReceive: number, toPay: number): number {
    return toReceive - toPay;
  }

  /**
   * Calcula total a receber (pending + partial)
   * Valor ainda a ser recebido
   */
  calculateToReceive(totals: Totals): number {
    return totals.pending + totals.partial;
  }

  /**
   * Calcula total a pagar (pending + partial)
   * Valor ainda a ser pago
   */
  calculateToPay(totals: Totals): number {
    return totals.pending + totals.partial;
  }
}
