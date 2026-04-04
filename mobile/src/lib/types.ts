/**
 * API Types for PayTrack Mobile
 */

// Auth
export interface User {
  id: string;
  email: string;
  name: string;
  isSystemAdmin: boolean;
  currentOrganization?: {
    id: string;
    name: string;
    role: UserRole;
  };
  availableOrganizations: Array<{
    id: string;
    name: string;
    role: UserRole;
  }>;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Dashboard
export interface DashboardData {
  balance: {
    toReceive: number;
    toPay: number;
    net: number;
  };
  payables: {
    pendingCount: number;
    partialCount: number;
    totalToPay: number;
    overdueItems: DashboardInstallmentItem[];
    upcomingItems: DashboardInstallmentItem[];
  };
  receivables: {
    pendingCount: number;
    partialCount: number;
    totalToReceive: number;
    overdueItems: DashboardInstallmentItem[];
    upcomingItems: DashboardInstallmentItem[];
  };
}

export interface DashboardInstallmentItem {
  id: string;
  installmentId: string | null;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  remaining: number;
  vendorName?: string | null;
  customerName?: string | null;
  categoryName: string | null;
}

// Payables
export interface PayableListItem {
  id: string;
  amount: number;
  status: AccountStatus;
  vendorName: string | null;
  categoryName: string | null;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  nextInstallmentId: string | null;
  installmentsCount: number;
  paidInstallments: number;
}

// Receivables
export interface ReceivableListItem {
  id: string;
  amount: number;
  status: AccountStatus;
  customerName: string | null;
  categoryName: string | null;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  nextInstallmentId: string | null;
  installmentsCount: number;
  receivedInstallments: number;
}

// Shared
export type AccountStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'PIX'
  | 'BOLETO'
  | 'CHECK'
  | 'ACCOUNT_DEBIT'
  | 'OTHER';

// API Response wrapper
export interface ListResponse<T> {
  items: T[];
  total: number;
}
