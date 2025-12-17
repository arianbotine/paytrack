import { z } from 'zod';
import { getTodayLocalInput } from '../../shared/utils/dateUtils';

// ============================================================
// Types & Interfaces
// ============================================================

export interface Payable {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  vendor: { name: string };
}

export interface Receivable {
  id: string;
  description: string;
  amount: number;
  receivedAmount: number;
  dueDate: string;
  status: string;
  customer: { name: string };
}

export interface PaymentAllocation {
  id: string;
  amount: number;
  payable?: Payable;
  receivable?: Receivable;
}

export interface PaymentDetails {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  notes?: string;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  payment: PaymentDetails;
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
    amount: z.coerce.number().positive('Valor deve ser positivo'),
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
    payableId: z.string().optional(),
    receivableId: z.string().optional(),
  })
  .refine(data => data.payableId || data.receivableId, {
    message: 'Selecione uma conta a pagar ou a receber',
    path: ['payableId'],
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
  paymentDate: getTodayLocalInput(),
  method: 'PIX',
  reference: '',
  notes: '',
  payableId: '',
  receivableId: '',
});
