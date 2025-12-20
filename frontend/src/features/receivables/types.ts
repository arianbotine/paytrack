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

export type ReceivableStatus =
  | 'PENDING'
  | 'PAID'
  | 'PARTIAL'
  | 'OVERDUE'
  | 'CANCELLED';

export interface ReceivableInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  receivedAmount: number;
  dueDate: string;
  status: ReceivableStatus;
  description: string;
  receivable?: {
    id: string;
    description: string;
    customer: { id: string; name: string };
  };
}

export interface Receivable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: ReceivableStatus;
  receivedAmount: number;
  invoiceNumber?: string;
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

export const receivableSchema = z
  .object({
    description: z.string().min(1, 'Descrição é obrigatória').max(255),
    amount: z.coerce.number().positive('Valor deve ser positivo'),
    dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
    customerId: z.string().min(1, 'Cliente é obrigatório'),
    categoryId: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
    invoiceNumber: z.string().optional(),
    // Campos de parcelas
    installmentCount: z.coerce.number().int().min(1).max(120).optional(),
    firstDueDate: z.string().optional(),
    dueDates: z.array(z.string()).optional(),
  })
  .refine(
    data => {
      // Se installmentCount > 1, firstDueDate é obrigatório
      if (data.installmentCount && data.installmentCount > 1) {
        return !!data.firstDueDate;
      }
      return true;
    },
    {
      message: 'Data do primeiro vencimento é obrigatória para parcelamento',
      path: ['firstDueDate'],
    }
  );

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
  description: '',
  amount: 0,
  dueDate: getTodayLocalInput(),
  customerId: '',
  categoryId: '',
  tagIds: [],
  notes: '',
  invoiceNumber: '',
  installmentCount: 1,
  firstDueDate: getTodayLocalInput(),
});
