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
  type?: 'PAYABLE' | 'RECEIVABLE';
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export type ReceivableStatus = 'PENDING' | 'PAID' | 'PARTIAL';

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
const paymentOnAccountSchema = z
  .object({
    installmentNumbers: z.array(z.number().int().positive()).optional(),
    paymentDate: z
      .string()
      .optional()
      .transform(val => (val === '' ? undefined : val)),
    paymentMethod: z
      .enum([
        'CASH',
        'CREDIT_CARD',
        'DEBIT_CARD',
        'BANK_TRANSFER',
        'PIX',
        'BOLETO',
        'CHECK',
        'ACCOUNT_DEBIT',
        'OTHER',
        '',
      ])
      .optional()
      .transform(val => (val === '' ? undefined : val)),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    data => {
      // Se nenhuma parcela selecionada, retornar true (válido)
      if (!data.installmentNumbers || data.installmentNumbers.length === 0) {
        return true;
      }
      // Se parcelas selecionadas, validar campos obrigatórios
      return !!data.paymentDate && !!data.paymentMethod;
    },
    {
      message:
        'Data e método de recebimento são obrigatórios quando parcelas são selecionadas',
      path: ['paymentMethod'],
    }
  )
  .refine(
    data => {
      // Validar que a data de recebimento não seja futura
      if (!data.paymentDate) return true;
      const selected = new Date(data.paymentDate);
      const now = new Date();
      return selected <= now;
    },
    {
      message: 'Data do recebimento não pode ser futura',
      path: ['paymentDate'],
    }
  )
  .transform(data => {
    // Se não há parcelas selecionadas, retornar undefined para limpar o campo
    if (!data.installmentNumbers || data.installmentNumbers.length === 0) {
      return undefined;
    }
    return data;
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
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'PAID', label: 'Recebido' },
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
