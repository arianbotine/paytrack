/**
 * Generic types for Payable/Receivable accounts
 */

export type AccountStatus =
  | 'PENDING'
  | 'OVERDUE'
  | 'PAID'
  | 'PARTIAL'
  | 'CANCELLED';

export interface BaseAccount {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: AccountStatus;
  invoiceNumber?: string;
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
}

export interface ReceivableAccount extends BaseAccount {
  customer: {
    id: string;
    name: string;
  };
  receivedAmount: number;
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
