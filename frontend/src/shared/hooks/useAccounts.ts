import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useUIStore } from '../../lib/stores/uiStore';
import { toUTC } from '../utils/dateUtils';

// ============================================================
// Types
// ============================================================

export type AccountType = 'payables' | 'receivables';

interface BaseResponse<T> {
  data: T[];
  total: number;
}

export interface UseAccountsConfig {
  type: AccountType;
  endpoint: string;
  queryKeyPrefix: readonly string[];
  messages: {
    createSuccess: string;
    createError: string;
    updateSuccess: string;
    updateError: string;
    deleteSuccess: string;
    deleteError: string;
  };
}

// ============================================================
// Query Keys Factory
// ============================================================

export const createAccountKeys = (prefix: readonly string[]) => ({
  all: prefix,
  lists: () => [...prefix, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...prefix, 'list', filters] as const,
  details: () => [...prefix, 'detail'] as const,
  detail: (id: string) => [...prefix, 'detail', id] as const,
});

// ============================================================
// Generic Accounts Query
// ============================================================

interface UseAccountsParams {
  status?: string;
  page: number;
  rowsPerPage: number;
}

export const useAccounts = <T>(
  config: UseAccountsConfig,
  params: UseAccountsParams
) => {
  const keys = createAccountKeys(config.queryKeyPrefix);

  return useQuery({
    queryKey: keys.list({
      status: params.status,
      page: params.page,
      rowsPerPage: params.rowsPerPage,
    }),
    queryFn: async (): Promise<BaseResponse<T>> => {
      const queryParams: Record<string, string | number> = {
        skip: params.page * params.rowsPerPage,
        take: params.rowsPerPage,
      };
      if (params.status && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      const response = await api.get(config.endpoint, { params: queryParams });
      return response.data;
    },
  });
};

// ============================================================
// Generic Related Data Query
// ============================================================

interface UseRelatedDataConfig {
  queryKey: readonly (string | undefined)[];
  endpoint: string;
  params?: Record<string, string>;
}

export const useRelatedData = <T>(config: UseRelatedDataConfig) => {
  return useQuery({
    queryKey: config.queryKey,
    queryFn: async (): Promise<T[]> => {
      const response = await api.get(config.endpoint, {
        params: config.params,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================
// Generic Mutations
// ============================================================

export const useCreateAccount = (
  config: UseAccountsConfig,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const keys = createAccountKeys(config.queryKeyPrefix);

  return useMutation({
    mutationFn: (data: unknown) => api.post(config.endpoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification(config.messages.createSuccess, 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification(config.messages.createError, 'error');
    },
  });
};

export const useUpdateAccount = (
  config: UseAccountsConfig,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const keys = createAccountKeys(config.queryKeyPrefix);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.patch(`${config.endpoint}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification(config.messages.updateSuccess, 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification(config.messages.updateError, 'error');
    },
  });
};

export const useDeleteAccount = (
  config: UseAccountsConfig,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const keys = createAccountKeys(config.queryKeyPrefix);

  return useMutation({
    mutationFn: (id: string) => api.delete(`${config.endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification(config.messages.deleteSuccess, 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification(config.messages.deleteError, 'error');
    },
  });
};

// ============================================================
// Combined Operations Hook
// ============================================================

export const useAccountOperations = <T>(
  config: UseAccountsConfig,
  callbacks?: {
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
  }
) => {
  const createMutation = useCreateAccount(config, callbacks?.onCreateSuccess);
  const updateMutation = useUpdateAccount(config, callbacks?.onUpdateSuccess);
  const deleteMutation = useDeleteAccount(config, callbacks?.onDeleteSuccess);

  const submitAccount = (
    data: T & { dueDate: string | Date },
    accountId?: string
  ) => {
    const payload = {
      ...data,
      dueDate:
        typeof data.dueDate === 'string' ? toUTC(data.dueDate) : data.dueDate,
      categoryId: (data as any).categoryId || undefined,
      tagIds: (data as any).tagIds?.length ? (data as any).tagIds : undefined,
    };

    if (accountId) {
      updateMutation.mutate({ id: accountId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    submitAccount,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
