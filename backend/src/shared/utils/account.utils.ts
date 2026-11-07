/**
 * Utility functions for account-related operations (payables/receivables)
 */

import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, AccountStatus } from '@prisma/client';
import { parseDateOnly } from './date.utils';

/**
 * Generates installment data for payables or receivables
 * @param totalAmount - Total amount to be divided
 * @param count - Number of installments
 * @param dueDates - Array of due dates for each installment
 * @param accountId - The account ID (payableId or receivableId)
 * @param organizationId - Organization ID
 * @param type - 'payable' or 'receivable' to determine the amount field
 * @returns Array of installment create inputs
 */
export function generateInstallments(
  totalAmount: number,
  count: number,
  dueDates: string[],
  accountId: string,
  organizationId: string,
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

export function calculateInstallmentAmountsFromCents(
  totalAmountCents: number,
  count: number
): Decimal[] {
  if (
    !Number.isSafeInteger(totalAmountCents) ||
    totalAmountCents <= 0 ||
    !Number.isInteger(count) ||
    count <= 0 ||
    totalAmountCents < count
  ) {
    throw new RangeError('Valor e quantidade de parcelas inválidos');
  }

  const baseCents = Math.floor(totalAmountCents / count);
  const remainderCents = totalAmountCents % count;

  return Array.from({ length: count }, (_, index) => {
    const cents = index === count - 1 ? baseCents + remainderCents : baseCents;
    const wholeUnits = Math.floor(cents / 100);
    const fractionalUnits = String(cents % 100).padStart(2, '0');
    return new Decimal(`${wholeUnits}.${fractionalUnits}`);
  });
}
