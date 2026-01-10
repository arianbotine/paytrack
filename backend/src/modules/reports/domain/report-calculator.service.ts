import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportCalculator {
  /**
   * Calcula variação percentual entre período atual e anterior
   */
  calculateVariance(current: number, previous: number): number {
    if (previous === 0) {
      return 0;
    }

    return ((current - previous) / previous) * 100;
  }

  /**
   * Calcula percentual de um valor em relação ao total
   */
  calculatePercentage(value: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return (value / total) * 100;
  }

  /**
   * Calcula saldo líquido (recebimentos - pagamentos)
   */
  calculateNetBalance(receivables: number, payables: number): number {
    return receivables - payables;
  }
}
