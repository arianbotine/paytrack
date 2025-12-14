/**
 * Date utilities for frontend - handle local time zone for date inputs and displays
 * For date-only fields, no conversion needed since dates are TZ-agnostic
 */

import { format, parseISO } from 'date-fns';

/**
 * Get today's date as a local date string (yyyy-MM-dd) for date inputs
 * Fixes issue where UTC-based default could show wrong date in non-UTC zones
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert ISO date string from backend to date input value (yyyy-MM-dd)
 * For date-only fields, simply extract the date part
 */
export function isoToDateInputValue(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Format ISO date string for display (dd/MM/yyyy)
 */
export function formatDateForDisplay(isoString: string): string {
  const date = parseISO(isoString);
  return format(date, 'dd/MM/yyyy');
}

/**
 * Validate if a date string is valid
 */
export function isValidDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}