import type {
  ReceivableFormData,
  ReceivablesResponse,
  Customer,
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

const receivablesConfig: UseAccountsConfig = {
  type: 'receivables',
  endpoint: '/receivables',
  queryKeyPrefix: ['receivables'],
  messages: {
    createSuccess: 'Conta a receber criada com sucesso!',
    createError: 'Erro ao criar conta a receber',
    updateSuccess: 'Conta a receber atualizada com sucesso!',
    updateError: 'Erro ao atualizar conta a receber',
    deleteSuccess: 'Conta a receber excluída com sucesso!',
    deleteError: 'Erro ao excluir conta a receber',
  },
};

// ============================================================
// Query Keys (for external use)
// ============================================================

export const receivableKeys = {
  all: ['receivables'] as const,
  lists: () => [...receivableKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...receivableKeys.lists(), filters] as const,
  details: () => [...receivableKeys.all, 'detail'] as const,
  detail: (id: string) => [...receivableKeys.details(), id] as const,
};

// ============================================================
// Receivables Query
// ============================================================

interface UseReceivablesParams {
  status?: string[];
  customerId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  installmentTagIds?: string[];
  installmentDueDateFrom?: string;
  installmentDueDateTo?: string;
  page: number;
  rowsPerPage: number;
}

export const useReceivables = (params: UseReceivablesParams) => {
  return useAccounts<ReceivablesResponse['data'][0]>(receivablesConfig, params);
};

// ============================================================
// Related Data Queries
// ============================================================

export const useCustomers = () => {
  return useRelatedData<Customer>({
    queryKey: ['customers'],
    endpoint: '/customers',
  });
};

export const useReceivableCategories = () => {
  return useRelatedData<Category>({
    queryKey: ['categories', 'RECEIVABLE'],
    endpoint: '/categories',
    params: { type: 'RECEIVABLE' },
  });
};

export const useTags = () => {
  return useRelatedData<Tag>({
    queryKey: ['tags'],
    endpoint: '/tags',
  });
};

// ============================================================
// Combined Hook for All Receivable Operations
// ============================================================

export const useReceivableOperations = (callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteInstallmentSuccess?: () => void;
  onUpdateInstallmentSuccess?: () => void;
}) => {
  const operations = useAccountOperations<ReceivableFormData>(
    receivablesConfig,
    callbacks
  );

  return {
    ...operations,
    submitReceivable: operations.submitAccount,
  };
};
