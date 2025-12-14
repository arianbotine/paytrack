import { differenceInDays, isAfter } from 'date-fns';
import { parseUTCDate } from './dateUtils';

/**
 * Account status utilities
 */

export const ACCOUNT_STATUS_LABELS = {
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
} as const;

export const ACCOUNT_STATUS_COLORS = {
  PENDING: 'warning',
  PARTIAL: 'info',
  PAID: 'success',
  OVERDUE: 'error',
  CANCELLED: 'default',
} as const;

export type AccountStatus = keyof typeof ACCOUNT_STATUS_LABELS;

/**
 * Check if account is due soon (within 7 days)
 */
export const isDueSoon = (dueDate: string, status: string): boolean => {
  if (status === 'PAID' || status === 'CANCELLED') return false;

  const today = new Date();
  const due = parseUTCDate(dueDate);
  const daysUntilDue = differenceInDays(due, today);

  return daysUntilDue >= 0 && daysUntilDue <= 7;
};

/**
 * Check if account is overdue
 */
export const isOverdue = (dueDate: string, status: string): boolean => {
  if (status === 'PAID' || status === 'CANCELLED') return false;

  const today = new Date();
  const due = parseUTCDate(dueDate);

  return status === 'OVERDUE' || isAfter(today, due);
};

/**
 * Get days until due date
 */
export const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date();
  const due = parseUTCDate(dueDate);
  return differenceInDays(due, today);
};

/**
 * Get alert type for due date
 * @returns 'error' for overdue, 'warning' for due soon, null otherwise
 */
export const getDueDateAlertType = (
  dueDate: string,
  status: string
): 'error' | 'warning' | null => {
  if (isOverdue(dueDate, status)) return 'error';
  if (isDueSoon(dueDate, status)) return 'warning';
  return null;
};
