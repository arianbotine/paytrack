import type {
  PayableFormData,
  PayablesResponse,
  Vendor,
  Category,
  Tag,
  PayableInstallmentItemsResponse,
} from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useUIStore } from '../../../lib/stores/uiStore';
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

export const payableInstallmentItemKeys = {
  all: ['payables', 'installment-items'] as const,
  list: (payableId: string, installmentId: string) =>
    [...payableInstallmentItemKeys.all, payableId, installmentId] as const,
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
}

export const usePayables = (params: UsePayablesParams) => {
  return useAccounts<PayablesResponse['data'][0]>(payablesConfig, params);
};

// ============================================================
// Installment Items Query/Mutations
// ============================================================

export interface InstallmentItemPayload {
  description: string;
  amount: number;
  tagIds?: string[];
  sortOrder?: number;
}

export interface UpdateInstallmentItemPayload {
  description?: string;
  amount?: number;
  tagIds?: string[];
  sortOrder?: number;
}

export const usePayableInstallmentItems = (
  payableId?: string,
  installmentId?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: payableInstallmentItemKeys.list(
      payableId || 'unknown',
      installmentId || 'unknown'
    ),
    queryFn: async (): Promise<PayableInstallmentItemsResponse> => {
      if (!payableId || !installmentId) {
        return {
          data: [],
          summary: {
            installmentAmount: 0,
            itemsTotal: 0,
            remainingAmountForItems: 0,
          },
        };
      }

      const response = await api.get(
        `/payables/${payableId}/installments/${installmentId}/items`
      );
      return response.data;
    },
    enabled: enabled && !!payableId && !!installmentId,
    staleTime: 0,
  });
};

export const usePayableInstallmentItemOperations = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  const invalidateItemQueries = async (
    payableId: string,
    installmentId: string
  ) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: payableKeys.all,
      }),
      queryClient.invalidateQueries({
        queryKey: payableInstallmentItemKeys.list(payableId, installmentId),
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard'],
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: ({
      payableId,
      installmentId,
      data,
    }: {
      payableId: string;
      installmentId: string;
      data: InstallmentItemPayload;
    }) =>
      api.post(
        `/payables/${payableId}/installments/${installmentId}/items`,
        data
      ),
    onSuccess: async (_, variables) => {
      await invalidateItemQueries(variables.payableId, variables.installmentId);
      showNotification('Item da parcela criado com sucesso!', 'success');
    },
    onError: () => {
      showNotification('Erro ao criar item da parcela', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      payableId,
      installmentId,
      itemId,
      data,
    }: {
      payableId: string;
      installmentId: string;
      itemId: string;
      data: UpdateInstallmentItemPayload;
    }) =>
      api.patch(
        `/payables/${payableId}/installments/${installmentId}/items/${itemId}`,
        data
      ),
    onSuccess: async (_, variables) => {
      await invalidateItemQueries(variables.payableId, variables.installmentId);
      showNotification('Item da parcela atualizado com sucesso!', 'success');
    },
    onError: () => {
      showNotification('Erro ao atualizar item da parcela', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      payableId,
      installmentId,
      itemId,
    }: {
      payableId: string;
      installmentId: string;
      itemId: string;
    }) =>
      api.delete(
        `/payables/${payableId}/installments/${installmentId}/items/${itemId}`
      ),
    onSuccess: async (_, variables) => {
      await invalidateItemQueries(variables.payableId, variables.installmentId);
      showNotification('Item da parcela excluído com sucesso!', 'success');
    },
    onError: () => {
      showNotification('Erro ao excluir item da parcela', 'error');
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
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
