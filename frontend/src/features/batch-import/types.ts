export type AccountStatus = 'idle' | 'processing' | 'success' | 'error';

export type AccountType = 'payable' | 'receivable';

export interface PaymentOnAccount {
  installmentNumbers: number[];
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export interface BatchAccount {
  id: string;
  // Vendor para payables, Customer para receivables
  vendorId?: string;
  customerId?: string;
  categoryId?: string;
  amount: number;
  installmentCount: number;
  dueDates: string[];
  tagIds: string[];
  notes?: string;
  payment?: PaymentOnAccount;
  // Status de processamento
  status: AccountStatus;
  errorMessage?: string;
}

export interface BatchState {
  accounts: BatchAccount[];
  accountType: AccountType;
}
