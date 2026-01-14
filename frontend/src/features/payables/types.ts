import { z } from 'zod';

// ============================================================
// Types & Interfaces
// ============================================================

export interface Vendor {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export type PayableStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED';

export interface PayableInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: PayableStatus;
  notes?: string;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
      color?: string;
    };
  }>;
  isOverdue?: boolean;
  payable?: {
    id: string;
    vendor: { id: string; name: string };
  };
}

export interface Payable {
  id: string;
  amount: number;
  nextUnpaidDueDate: string | null;
  nextUnpaidAmount: number | null;
  status: PayableStatus;
  paidAmount: number;
  notes?: string;
  totalInstallments: number;
  vendor: Vendor;
  category?: Category;
  tags: { tag: Tag }[];
  installments: PayableInstallment[];
  createdAt: string;
}

export interface PayablesResponse {
  data: Payable[];
  total: number;
}

// ============================================================
// Validation Schema
// ============================================================

// Schema de pagamento opcional durante criação
const paymentOnAccountSchema = z.object({
  installmentNumbers: z
    .array(z.number().int().positive())
    .min(1, 'Selecione pelo menos uma parcela para pagar'),
  paymentDate: z
    .string()
    .min(1, 'Data do pagamento é obrigatória')
    .refine(
      date => {
        if (!date) return true;
        const selected = new Date(date);
        const now = new Date();
        return selected <= now;
      },
      { message: 'Data do pagamento não pode ser futura' }
    ),
  paymentMethod: z.enum(
    [
      'CASH',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'BANK_TRANSFER',
      'PIX',
      'BOLETO',
      'CHECK',
      'ACCOUNT_DEBIT',
      'OTHER',
    ],
    { required_error: 'Método de pagamento é obrigatório' }
  ),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const payableSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  firstDueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  vendorId: z.string().min(1, 'Credor é obrigatório'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Campos de parcelas
  installmentCount: z.coerce.number().int().min(1).max(120).optional(),
  dueDates: z.array(z.string()).optional(),
  // Campo de pagamento opcional
  payment: paymentOnAccountSchema.optional(),
});

export type PayableFormData = z.infer<typeof payableSchema>;

// ============================================================
// Status Options for Filters
// ============================================================

export const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'OVERDUE', label: 'Vencido' },
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'PAID', label: 'Pago' },
  { value: 'CANCELLED', label: 'Cancelado' },
] as const;

// ============================================================
// Utility Functions
// ============================================================

import { getTodayLocalInput } from '../../shared/utils/dateUtils';

export const getDefaultFormValues = (): PayableFormData => ({
  amount: 0,
  firstDueDate: getTodayLocalInput(),
  vendorId: '',
  categoryId: '',
  tagIds: [],
  notes: '',
  installmentCount: 1,
});
