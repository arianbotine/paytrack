/**
 * Date utilities for backend
 * - For date-only fields (dueDate): use parseDateOnly - no timezone conversion
 * - For datetime fields (paymentDate): use parseDatetime - handles ISO strings with time
 */

/**
 * Parse date-only string (yyyy-MM-dd) to Date object
 * Used for fields like dueDate which are @db.Date in Prisma
 * No timezone conversion - treats date as-is
 */
export function parseDateOnly(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Parse datetime string (ISO format) to Date object
 * Used for fields like paymentDate which are @db.Timestamp in Prisma
 */
export function parseDatetime(dateString: string): Date {
  return new Date(dateString);
}

export function formatDateUTC(date: Date): string {
  return date.toISOString();
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime());
}

/**
 * Verifica se uma data de vencimento está vencida
 * Uma data é considerada vencida apenas se for ANTERIOR ao dia atual
 * Datas de hoje ou futuras NÃO são consideradas vencidas
 * @param dueDate Data de vencimento
 * @returns true se a data está vencida (passada), false caso contrário
 */
export function isOverdue(dueDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);

  return dueDateOnly < today;
}

/**
 * Obtém a data de hoje sem horário (00:00:00)
 * Útil para comparações de data
 */
export function getTodayWithoutTime(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}
