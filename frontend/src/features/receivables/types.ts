import { z } from 'zod';
import { getTodayLocalInput } from '../../shared/utils/dateUtils';

// ============================================================
// Types & Interfaces
// ============================================================

export interface Customer {
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

export type ReceivableStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED';

export interface ReceivableInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  receivedAmount: number;
  dueDate: string;
  status: ReceivableStatus;
  notes?: string;
  tags?: { tag: Tag }[];
  isOverdue?: boolean;
  receivable?: {
    id: string;
    customer: { id: string; name: string };
  };
}

export interface Receivable {
  id: string;
  amount: number;
  nextUnpaidDueDate: string | null;
  nextUnpaidAmount: number | null;
  status: ReceivableStatus;
  receivedAmount: number;
  notes?: string;
  totalInstallments: number;
  customer: Customer;
  category?: Category;
  tags: { tag: Tag }[];
  installments: ReceivableInstallment[];
  createdAt: string;
}

export interface ReceivablesResponse {
  data: Receivable[];
  total: number;
}

// ============================================================
// Validation Schema
// ============================================================

// Schema de pagamento opcional durante criação
const paymentOnAccountSchema = z.object({
  installmentNumbers: z
    .array(z.number().int().positive())
    .min(1, 'Selecione pelo menos uma parcela para receber'),
  paymentDate: z
    .string()
    .min(1, 'Data do recebimento é obrigatória')
    .refine(
      date => {
        if (!date) return true;
        const selected = new Date(date);
        const now = new Date();
        return selected <= now;
      },
      { message: 'Data do recebimento não pode ser futura' }
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
    { required_error: 'Método de recebimento é obrigatório' }
  ),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const receivableSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  firstDueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  customerId: z.string().min(1, 'Devedor é obrigatório'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Campos de parcelas
  installmentCount: z.coerce.number().int().min(1).max(120).optional(),
  dueDates: z.array(z.string()).optional(),
  // Campo de pagamento opcional
  payment: paymentOnAccountSchema.optional(),
});

export type ReceivableFormData = z.infer<typeof receivableSchema>;

// ============================================================
// Status Options for Filters
// ============================================================

export const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'OVERDUE', label: 'Vencido' },
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'PAID', label: 'Recebido' },
  { value: 'CANCELLED', label: 'Cancelado' },
] as const;

// ============================================================
// Utility Functions
// ============================================================

export const getDefaultFormValues = (): ReceivableFormData => ({
  amount: 0,
  firstDueDate: getTodayLocalInput(),
  customerId: '',
  categoryId: '',
  tagIds: [],
  notes: '',
  installmentCount: 1,
});
