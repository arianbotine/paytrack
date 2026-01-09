import { Injectable } from '@nestjs/common';
import { Prisma, AccountStatus } from '@prisma/client';
import { generateInstallments } from '../../../shared/utils/account.utils';
import { PayableStatus } from './payable-status.enum';

/**
 * Serviço de domínio para lógica de cálculo e manipulação de parcelas
 * Não depende de repositórios, apenas aplica regras de negócio
 */
@Injectable()
export class InstallmentsCalculator {
  /**
   * Gera parcelas com base no valor total e quantidade
   */
  generateInstallments(
    totalAmount: number,
    installmentCount: number,
    dueDates: string[],
    accountId: string,
    organizationId: string,
    accountType: 'payable' | 'receivable'
  ):
    | Prisma.PayableInstallmentCreateManyInput[]
    | Prisma.ReceivableInstallmentCreateManyInput[] {
    return generateInstallments(
      totalAmount,
      installmentCount,
      dueDates,
      accountId,
      organizationId,
      accountType
    ) as any;
  }

  /**
   * Calcula novas datas de vencimento para parcelas mensais
   */
  calculateMonthlyDueDates(startDate: Date, installmentCount: number): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < installmentCount; i++) {
      const date = new Date(startDate);
      date.setUTCMonth(date.getUTCMonth() + i);
      dates.push(date);
    }
    return dates;
  }

  /**
   * Determina o status de uma parcela ou conta com base em valores pagos
   */
  calculateStatus(
    totalAmount: number,
    paidAmount: number,
    threshold: number = 0.01
  ): AccountStatus {
    if (paidAmount >= totalAmount - threshold) {
      return PayableStatus.PAID;
    } else if (paidAmount > 0) {
      return PayableStatus.PARTIAL;
    }
    return PayableStatus.PENDING;
  }
}
