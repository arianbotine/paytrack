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

export interface Receivable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: ReceivableStatus;
  receivedAmount: number;
  invoiceNumber?: string;
  notes?: string;
  customer: Customer;
  category?: Category;
  tags: { tag: Tag }[];
  createdAt: string;
}

export interface ReceivablesResponse {
  data: Receivable[];
  total: number;
}

// ============================================================
// Validation Schema
// ============================================================

export const receivableSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
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
  description: '',
  amount: 0,
  dueDate: getTodayLocalInput(),
  customerId: '',
  categoryId: '',
  tagIds: [],
  notes: '',
  invoiceNumber: '',
});
