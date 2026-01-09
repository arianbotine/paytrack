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
  status: PayableStatus;
  paidAmount: number;
  invoiceNumber?: string;
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

export const payableSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  firstDueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  vendorId: z.string().min(1, 'Credor é obrigatório'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
  // Campos de parcelas
  installmentCount: z.coerce.number().int().min(1).max(120).optional(),
  dueDates: z.array(z.string()).optional(),
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
  invoiceNumber: '',
  installmentCount: 1,
});
