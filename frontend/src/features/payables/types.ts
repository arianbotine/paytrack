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
  type?: 'PAYABLE' | 'RECEIVABLE';
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export type PayableStatus = 'PENDING' | 'PAID' | 'PARTIAL';

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
        'Data e método de pagamento são obrigatórios quando parcelas são selecionadas',
      path: ['paymentMethod'],
    }
  )
  .refine(
    data => {
      // Validar que a data de pagamento não seja futura
      if (!data.paymentDate) return true;
      const selected = new Date(data.paymentDate);
      const now = new Date();
      return selected <= now;
    },
    {
      message: 'Data do pagamento não pode ser futura',
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
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'PAID', label: 'Pago' },
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
