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

export type PayableStatus =
  | 'PENDING'
  | 'PAID'
  | 'PARTIAL'
  | 'OVERDUE'
  | 'CANCELLED';

export interface Payable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: PayableStatus;
  paidAmount: number;
  invoiceNumber?: string;
  notes?: string;
  vendor: Vendor;
  category?: Category;
  tags: { tag: Tag }[];
  createdAt: string;
}

export interface PayablesResponse {
  data: Payable[];
  total: number;
}

// ============================================================
// Validation Schema
// ============================================================

export const payableSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  vendorId: z.string().min(1, 'Fornecedor é obrigatório'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
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

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getDefaultFormValues = (): PayableFormData => ({
  description: '',
  amount: 0,
  dueDate: getTodayLocalInput(),
  vendorId: '',
  categoryId: '',
  tagIds: [],
  notes: '',
  invoiceNumber: '',
});
