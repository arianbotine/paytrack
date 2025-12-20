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
