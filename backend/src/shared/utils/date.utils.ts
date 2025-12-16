/**
 * Date utilities for backend - all dates are treated as UTC
 * No time zone conversions are performed here
 */

export function parseDateUTC(dateString: string): Date {
  // For date-only strings (yyyy-MM-dd), create UTC date at midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00.000Z');
  }
  // For full ISO strings, ensure UTC interpretation
  return new Date(dateString);
}

export function formatDateUTC(date: Date): string {
  // Return ISO string in UTC
  return date.toISOString();
}

export function isValidDate(dateString: string): boolean {
  const date = parseDateUTC(dateString);
  return !isNaN(date.getTime());
}
