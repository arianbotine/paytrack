import { Injectable } from '@nestjs/common';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { isOverdue } from '../../../shared/utils/date.utils';

/**
 * Serviço responsável por transformar dados de contas a receber
 */
@Injectable()
export class ReceivableDataTransformer {
  /**
   * Transforma dados monetários de uma lista de receivables
   */
  transformReceivablesList(data: any[]): any[] {
    return MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'receivedAmount',
    ]);
  }

  /**
   * Transforma dados monetários de um receivable único
   */
  transformReceivableSingle(receivable: any): any {
    return MoneyUtils.transformMoneyFields(receivable, [
      'amount',
      'receivedAmount',
    ]);
  }

  /**
   * Adiciona campos calculados aos dados de receivables
   */
  enrichReceivablesWithCalculatedFields(
    receivables: any[],
    nextInstallmentInfo: Map<
      string,
      { dueDate: string; remainingAmount: number }
    >
  ): any[] {
    return receivables.map(receivable => ({
      ...receivable,
      nextUnpaidDueDate:
        nextInstallmentInfo.get(receivable.id)?.dueDate || null,
      nextUnpaidAmount:
        nextInstallmentInfo.get(receivable.id)?.remainingAmount || null,
      installments: receivable.installments?.map((inst: any) => ({
        ...inst,
        isOverdue: isOverdue(inst.dueDate),
      })),
    }));
  }

  /**
   * Adiciona campos calculados a um receivable único
   */
  enrichReceivableWithCalculatedFields(
    receivable: any,
    nextInstallmentInfo: { dueDate: string; remainingAmount: number } | null
  ): any {
    return {
      ...receivable,
      nextUnpaidDueDate: nextInstallmentInfo?.dueDate || null,
      nextUnpaidAmount: nextInstallmentInfo?.remainingAmount || null,
      installments: receivable.installments.map((inst: any) => ({
        ...inst,
        amount: Number(inst.amount),
        receivedAmount: Number(inst.receivedAmount),
        isOverdue: isOverdue(inst.dueDate),
      })),
    };
  }
}
