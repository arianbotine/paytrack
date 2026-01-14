/**
 * Generic types for Payable/Receivable accounts
 */

export type AccountStatus = 'PENDING' | 'PAID' | 'PARTIAL';

export interface PayableInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: AccountStatus;
  isOverdue?: boolean;
}

export interface ReceivableInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  receivedAmount: number;
  dueDate: string;
  status: AccountStatus;
  isOverdue?: boolean;
}

export interface BaseAccount {
  id: string;
  amount: number;
  nextUnpaidDueDate: string | null;
  status: AccountStatus;
  totalInstallments: number;
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color?: string;
    };
  }>;
}

export interface PayableAccount extends BaseAccount {
  vendor: {
    id: string;
    name: string;
  };
  paidAmount: number;
  installments: PayableInstallment[];
}

export interface ReceivableAccount extends BaseAccount {
  customer: {
    id: string;
    name: string;
  };
  receivedAmount: number;
  installments: ReceivableInstallment[];
}

export type AccountType = 'payable' | 'receivable';

export interface AccountTableConfig {
  type: AccountType;
  entityLabel: string;
  entityFieldLabel: string;
  amountFieldLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}
