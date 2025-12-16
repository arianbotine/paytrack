/**
 * Utility functions for account-related operations (payables/receivables)
 */

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
