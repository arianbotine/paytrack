import { z } from 'zod';
import { getNowLocalDatetimeInput } from '../../shared/utils/dateUtils';

// ============================================================
// Types & Interfaces
// ============================================================

export interface PayableInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  payable: {
    id: string;
    vendor: { name: string };
  };
}

export interface ReceivableInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  receivable: {
    id: string;
    customer: { name: string };
  };
}

export interface PaymentAllocation {
  id: string;
  amount: number;
  payableInstallment?: PayableInstallment;
  receivableInstallment?: ReceivableInstallment;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
  allocations: Array<{
    id: string;
    amount: number;
    installmentNumber?: number;
    installmentId?: string;
  }>;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  allocations: PaymentAllocation[];
}

export interface PaymentsResponse {
  data: Payment[];
  total: number;
}

export type PaymentType = 'PAYABLE' | 'RECEIVABLE';

// ============================================================
// Constants
// ============================================================

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'BANK_TRANSFER', label: 'Transferência Bancária' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'OTHER', label: 'Outro' },
] as const;

// ============================================================
// Validation Schema
// ============================================================

export const paymentSchema = z
  .object({
    amount: z.coerce.number().positive('Valor deve ser maior que zero'),
    paymentDate: z.string().min(1, 'Data do pagamento é obrigatória'),
    method: z.enum([
      'CASH',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'BANK_TRANSFER',
      'PIX',
      'BOLETO',
      'CHECK',
      'OTHER',
    ]),
    reference: z.string().optional(),
    notes: z.string().optional(),
    payableInstallmentId: z.string().optional(),
    receivableInstallmentId: z.string().optional(),
  })
  .refine(data => data.payableInstallmentId || data.receivableInstallmentId, {
    message: 'Selecione uma parcela a pagar ou a receber',
    path: ['payableInstallmentId'],
  });

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ============================================================
// Utility Functions
// ============================================================

export const getMethodLabel = (method: string): string => {
  return PAYMENT_METHODS.find(m => m.value === method)?.label || method;
};

export const getDefaultFormValues = (): PaymentFormData => ({
  amount: 0,
  paymentDate: getNowLocalDatetimeInput(),
  method: 'PIX',
  reference: '',
  notes: '',
  payableInstallmentId: '',
  receivableInstallmentId: '',
});
