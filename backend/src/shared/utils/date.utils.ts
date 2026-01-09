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
 *
 * Usa componentes UTC de data (ano, mês, dia) para evitar problemas de timezone
 * @param dueDate Data de vencimento
 * @returns true se a data está vencida (passada), false caso contrário
 */
export function isOverdue(dueDate: Date): boolean {
  const today = new Date();
  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  const dueDateUTC = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate()
  );

  return dueDateUTC < todayUTC;
}

/**
 * Obtém a data de hoje sem horário (00:00:00)
 * Útil para comparações de data
 * Usa Date.UTC para evitar problemas de timezone
 */
export function getTodayWithoutTime(): Date {
  const today = new Date();
  return new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );
}
