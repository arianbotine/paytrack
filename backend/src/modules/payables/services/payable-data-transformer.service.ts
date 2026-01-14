import { Injectable } from '@nestjs/common';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { isOverdue } from '../../../shared/utils/date.utils';

/**
 * Serviço responsável por transformar dados de contas a pagar
 */
@Injectable()
export class PayableDataTransformer {
  /**
   * Transforma dados monetários de uma lista de payables
   */
  transformPayablesList(data: any[]): any[] {
    return MoneyUtils.transformMoneyFieldsArray(data, ['amount', 'paidAmount']);
  }

  /**
   * Transforma dados monetários de um payable único
   */
  transformPayableSingle(payable: any): any {
    return MoneyUtils.transformMoneyFields(payable, ['amount', 'paidAmount']);
  }

  /**
   * Adiciona campos calculados aos dados de payables
   */
  enrichPayablesWithCalculatedFields(
    payables: any[],
    nextInstallmentInfo: Map<
      string,
      { dueDate: string; remainingAmount: number }
    >
  ): any[] {
    return payables.map(payable => ({
      ...payable,
      nextUnpaidDueDate: nextInstallmentInfo.get(payable.id)?.dueDate || null,
      nextUnpaidAmount:
        nextInstallmentInfo.get(payable.id)?.remainingAmount || null,
      installments: payable.installments?.map((inst: any) => ({
        ...inst,
        isOverdue: isOverdue(inst.dueDate),
      })),
    }));
  }

  /**
   * Adiciona campos calculados a um payable único
   */
  enrichPayableWithCalculatedFields(
    payable: any,
    nextInstallmentInfo: { dueDate: string; remainingAmount: number } | null
  ): any {
    return {
      ...payable,
      nextUnpaidDueDate: nextInstallmentInfo?.dueDate || null,
      nextUnpaidAmount: nextInstallmentInfo?.remainingAmount || null,
      installments: payable.installments.map((inst: any) => ({
        ...inst,
        amount: Number(inst.amount),
        paidAmount: Number(inst.paidAmount),
        isOverdue: isOverdue(inst.dueDate),
      })),
    };
  }
}
