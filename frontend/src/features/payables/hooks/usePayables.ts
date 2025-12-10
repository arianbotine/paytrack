import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useUIStore } from '../../../lib/stores/uiStore';
import type {
  PayableFormData,
  PayablesResponse,
  Vendor,
  Category,
  Tag,
} from '../types';

// ============================================================
// Query Keys
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
  status?: string;
  page: number;
  rowsPerPage: number;
}

export const usePayables = ({
  status,
  page,
  rowsPerPage,
}: UsePayablesParams) => {
  return useQuery({
    queryKey: payableKeys.list({ status, page, rowsPerPage }),
    queryFn: async (): Promise<PayablesResponse> => {
      const params: Record<string, string | number> = {
        skip: page * rowsPerPage,
        take: rowsPerPage,
      };
      if (status && status !== 'ALL') {
        params.status = status;
      }
      const response = await api.get('/payables', { params });
      return response.data;
    },
  });
};

// ============================================================
// Related Data Queries
// ============================================================

export const useVendors = () => {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async (): Promise<Vendor[]> => {
      const response = await api.get('/vendors');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories', 'PAYABLE'],
    queryFn: async (): Promise<Category[]> => {
      const response = await api.get('/categories', {
        params: { type: 'PAYABLE' },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<Tag[]> => {
      const response = await api.get('/tags');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================
// Mutations
// ============================================================

export const useCreatePayable = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: PayableFormData) => api.post('/payables', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payableKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification('Conta a pagar criada com sucesso!', 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification('Erro ao criar conta a pagar', 'error');
    },
  });
};

export const useUpdatePayable = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayableFormData }) =>
      api.patch(`/payables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payableKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification('Conta a pagar atualizada com sucesso!', 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification('Erro ao atualizar conta a pagar', 'error');
    },
  });
};

export const useDeletePayable = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/payables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payableKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification('Conta a pagar excluída com sucesso!', 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification('Erro ao excluir conta a pagar', 'error');
    },
  });
};

// ============================================================
// Combined Hook for All Payable Operations
// ============================================================

export const usePayableOperations = (callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}) => {
  const createMutation = useCreatePayable(callbacks?.onCreateSuccess);
  const updateMutation = useUpdatePayable(callbacks?.onUpdateSuccess);
  const deleteMutation = useDeletePayable(callbacks?.onDeleteSuccess);

  const submitPayable = (data: PayableFormData, payableId?: string) => {
    const payload = {
      ...data,
      categoryId: data.categoryId || undefined,
      tagIds: data.tagIds?.length ? data.tagIds : undefined,
    };

    if (payableId) {
      updateMutation.mutate({ id: payableId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    submitPayable,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
