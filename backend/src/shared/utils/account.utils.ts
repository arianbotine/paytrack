/**
 * Utility functions for account-related operations (payables/receivables)
 */

import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, AccountStatus } from '@prisma/client';
import { parseDateOnly } from './date.utils';

/**
 * Maps invoiceNumber to documentNumber for Prisma compatibility
 * @param data - The update data object
 * @returns The data with invoiceNumber mapped to documentNumber
 */
export function mapInvoiceToDocument<T extends Record<string, any>>(
  data: T
): Omit<T, 'invoiceNumber'> & { documentNumber?: string } {
  const { invoiceNumber, ...rest } = data;
  return {
    ...rest,
    ...(invoiceNumber !== undefined && { documentNumber: invoiceNumber }),
  };
}

/**
 * Generates installment data for payables or receivables
 * @param totalAmount - Total amount to be divided
 * @param count - Number of installments
 * @param dueDates - Array of due dates for each installment
 * @param accountId - The account ID (payableId or receivableId)
 * @param organizationId - Organization ID
 * @param description - Description for installments
 * @param type - 'payable' or 'receivable' to determine the amount field
 * @returns Array of installment create inputs
 */
export function generateInstallments(
  totalAmount: number,
  count: number,
  dueDates: string[],
  accountId: string,
  organizationId: string,
  description: string,
  type: 'payable' | 'receivable'
): (
  | Prisma.PayableInstallmentCreateManyInput
  | Prisma.ReceivableInstallmentCreateManyInput
)[] {
  const totalDecimal = new Decimal(totalAmount);
  const baseValue = totalDecimal
    .dividedBy(count)
    .toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const remainder = totalDecimal.minus(baseValue.times(count));

  const installments: (
    | Prisma.PayableInstallmentCreateManyInput
    | Prisma.ReceivableInstallmentCreateManyInput
  )[] = [];

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const installmentAmount = isLast ? baseValue.plus(remainder) : baseValue;

    const baseInstallment = {
      organizationId,
      installmentNumber: i + 1,
      totalInstallments: count,
      amount: installmentAmount,
      dueDate: parseDateOnly(dueDates[i]),
      status: AccountStatus.PENDING,
      description,
    };

    if (type === 'payable') {
      installments.push({
        ...baseInstallment,
        payableId: accountId,
        paidAmount: new Decimal(0),
      } as Prisma.PayableInstallmentCreateManyInput);
    } else {
      installments.push({
        ...baseInstallment,
        receivableId: accountId,
        receivedAmount: new Decimal(0),
      } as Prisma.ReceivableInstallmentCreateManyInput);
    }
  }

  return installments;
}
