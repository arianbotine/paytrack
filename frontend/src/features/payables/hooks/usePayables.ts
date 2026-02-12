import type {
  PayableFormData,
  PayablesResponse,
  Vendor,
  Category,
  Tag,
} from '../types';
import {
  useAccounts,
  useRelatedData,
  useAccountOperations,
  type UseAccountsConfig,
} from '../../../shared/hooks/useAccounts';

// ============================================================
// Configuration
// ============================================================

const payablesConfig: UseAccountsConfig = {
  type: 'payables',
  endpoint: '/payables',
  queryKeyPrefix: ['payables'],
  messages: {
    createSuccess: 'Conta a pagar criada com sucesso!',
    createError: 'Erro ao criar conta a pagar',
    updateSuccess: 'Conta a pagar atualizada com sucesso!',
    updateError: 'Erro ao atualizar conta a pagar',
    deleteSuccess: 'Conta a pagar excluída com sucesso!',
    deleteError: 'Erro ao excluir conta a pagar',
  },
};

// ============================================================
// Query Keys (for external use)
// ============================================================

export const payableKeys = {
  all: ['payables'] as const,
  lists: () => [...payableKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...payableKeys.lists(), filters] as const,
  details: () => [...payableKeys.all, 'detail'] as const,
  detail: (id: string) => [...payableKeys.details(), id] as const,
};

// ============================================================
// Payables Query
// ============================================================

interface UsePayablesParams {
  status?: string[];
  vendorId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  installmentTagIds?: string[];
  installmentDueDateFrom?: string;
  installmentDueDateTo?: string;
  nextDueMonth?: string;
  page: number;
  rowsPerPage: number;
}

export const usePayables = (params: UsePayablesParams) => {
  return useAccounts<PayablesResponse['data'][0]>(payablesConfig, params);
};

// ============================================================
// Related Data Queries
// ============================================================

export const useVendors = () => {
  return useRelatedData<Vendor>({
    queryKey: ['vendors'],
    endpoint: '/vendors',
  });
};

export const useCategories = () => {
  return useRelatedData<Category>({
    queryKey: ['categories', 'PAYABLE'],
    endpoint: '/categories',
    params: { type: 'PAYABLE' },
  });
};

export const useTags = () => {
  return useRelatedData<Tag>({
    queryKey: ['tags'],
    endpoint: '/tags',
  });
};

// ============================================================
// Combined Hook for All Payable Operations
// ============================================================

export const usePayableOperations = (callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteInstallmentSuccess?: () => void;
  onUpdateInstallmentSuccess?: () => void;
}) => {
  const operations = useAccountOperations<PayableFormData>(
    payablesConfig,
    callbacks
  );

  return {
    ...operations,
    submitPayable: operations.submitAccount,
  };
};
