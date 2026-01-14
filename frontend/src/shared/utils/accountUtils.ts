import { differenceInDays, startOfDay } from 'date-fns';

/**
 * Account status utilities
 */

export const ACCOUNT_STATUS_LABELS = {
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
} as const;

export const ACCOUNT_STATUS_COLORS = {
  PENDING: 'warning',
  PARTIAL: 'info',
  PAID: 'success',
} as const;

export type AccountStatus = keyof typeof ACCOUNT_STATUS_LABELS;

/**
 * Check if account is due soon (within 7 days)
 */
export const isDueSoon = (dueDate: string, status: string): boolean => {
  if (status === 'PAID') return false;

  // Normalizar para início do dia para comparar apenas a data, sem horário
  const today = startOfDay(new Date());
  // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
  const dueDateString = dueDate.split('T')[0];
  const due = startOfDay(new Date(dueDateString));
  const daysUntilDue = differenceInDays(due, today);

  return daysUntilDue >= 0 && daysUntilDue <= 7;
};

/**
 * Check if account is overdue
 * Agora apenas compara datas - o backend já envia o campo isOverdue calculado
 */
export const isOverdue = (dueDate: string, status: string): boolean => {
  if (status === 'PAID') return false;

  // Extrair apenas a parte da data (YYYY-MM-DD) para comparação sem timezone
  const dueDateOnly = dueDate.split('T')[0];
  const today = new Date();
  const todayOnly = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Vencido = data de vencimento é ANTES de hoje
  return dueDateOnly < todayOnly;
};

/**
 * Get days until due date
 */
export const getDaysUntilDue = (dueDate: string): number => {
  // Normalizar para início do dia para comparar apenas a data, sem horário
  const today = startOfDay(new Date());
  // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
  const dueDateString = dueDate.split('T')[0];
  const due = startOfDay(new Date(dueDateString));
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
