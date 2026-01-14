import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useUIStore } from '../../lib/stores/uiStore';

// ============================================================
// Types
// ============================================================

export type AccountType = 'payables' | 'receivables';

interface BaseResponse<T> {
  data: T[];
  total: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AccountFormData {
  categoryId?: string | null;
  tagIds?: string[];
  dueDates?: string[];
  firstDueDate?: string;
  [key: string]: unknown;
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
  status?: string | string[];
  vendorId?: string | null;
  customerId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  installmentTagIds?: string[];
  installmentDueDateFrom?: string;
  installmentDueDateTo?: string;
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
      vendorId: params.vendorId,
      customerId: params.customerId,
      categoryId: params.categoryId,
      tagIds: params.tagIds,
      installmentTagIds: params.installmentTagIds,
      installmentDueDateFrom: params.installmentDueDateFrom,
      installmentDueDateTo: params.installmentDueDateTo,
      page: params.page,
      rowsPerPage: params.rowsPerPage,
    }),
    queryFn: async (): Promise<BaseResponse<T>> => {
      const queryParams: Record<string, string | number> = {
        skip: params.page * params.rowsPerPage,
        take: params.rowsPerPage,
      };

      // Handle status - pode ser string ou array
      if (params.status) {
        if (Array.isArray(params.status) && params.status.length > 0) {
          queryParams.status = params.status.join(',');
        } else if (
          typeof params.status === 'string' &&
          params.status !== 'ALL'
        ) {
          queryParams.status = params.status;
        }
      }

      // Handle other filters
      if (params.vendorId) {
        queryParams.vendorId = params.vendorId;
      }
      if (params.customerId) {
        queryParams.customerId = params.customerId;
      }
      if (params.categoryId) {
        queryParams.categoryId = params.categoryId;
      }
      if (params.tagIds && params.tagIds.length > 0) {
        queryParams.tagIds = params.tagIds.join(',');
      }
      if (params.installmentTagIds && params.installmentTagIds.length > 0) {
        queryParams.installmentTagIds = params.installmentTagIds.join(',');
      }
      if (params.installmentDueDateFrom) {
        queryParams.installmentDueDateFrom = params.installmentDueDateFrom;
      }
      if (params.installmentDueDateTo) {
        queryParams.installmentDueDateTo = params.installmentDueDateTo;
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
    onError: (error: ApiError) => {
      const message =
        error.response?.data?.message || config.messages.createError;
      showNotification(message, 'error');
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
    onError: (error: ApiError) => {
      const message =
        error.response?.data?.message || config.messages.updateError;
      showNotification(message, 'error');
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
    onError: (error: ApiError) => {
      const message =
        error.response?.data?.message || config.messages.deleteError;
      showNotification(message, 'error');
    },
  });
};

export const useDeleteInstallment = (
  config: UseAccountsConfig,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const keys = createAccountKeys(config.queryKeyPrefix);

  return useMutation({
    mutationFn: ({
      accountId,
      installmentId,
    }: {
      accountId: string;
      installmentId: string;
    }) =>
      api.delete(
        `${config.endpoint}/${accountId}/installments/${installmentId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification('Parcela excluída com sucesso!', 'success');
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      const message =
        error.response?.data?.message || 'Erro ao excluir parcela';
      showNotification(message, 'error');
    },
  });
};

export const useUpdateInstallment = (
  config: UseAccountsConfig,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const keys = createAccountKeys(config.queryKeyPrefix);

  return useMutation({
    mutationFn: ({
      accountId,
      installmentId,
      data,
    }: {
      accountId: string;
      installmentId: string;
      data: {
        amount?: number;
        dueDate?: string;
        notes?: string;
        tagIds?: string[];
      };
    }) =>
      api.patch(
        `${config.endpoint}/${accountId}/installments/${installmentId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification('Parcela atualizada com sucesso!', 'success');
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      const message =
        error.response?.data?.message || 'Erro ao atualizar parcela';
      showNotification(message, 'error');
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
    onDeleteInstallmentSuccess?: () => void;
    onUpdateInstallmentSuccess?: () => void;
  }
) => {
  const { showNotification } = useUIStore();
  const createMutation = useCreateAccount(config, callbacks?.onCreateSuccess);
  const updateMutation = useUpdateAccount(config, callbacks?.onUpdateSuccess);
  const deleteMutation = useDeleteAccount(config, callbacks?.onDeleteSuccess);
  const deleteInstallmentMutation = useDeleteInstallment(
    config,
    callbacks?.onDeleteInstallmentSuccess
  );
  const updateInstallmentMutation = useUpdateInstallment(
    config,
    callbacks?.onUpdateInstallmentSuccess
  );

  const submitAccount = (
    data: T & {
      dueDate?: string | Date;
      firstDueDate?: string | Date;
      dueDates?: string[];
    },
    accountId?: string
  ) => {
    const formData = data as T &
      AccountFormData & {
        dueDate?: string | Date;
        firstDueDate?: string | Date;
      };

    // Para edição de conta, não validar data de vencimento pois não existe mais no nível da conta
    if (!accountId) {
      const dueDate = formData.dueDate ?? formData.firstDueDate;
      const hasDueDatesArray =
        formData.dueDates && formData.dueDates.length > 0;

      if (!dueDate && !hasDueDatesArray) {
        showNotification('Data de vencimento é obrigatória', 'error');
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { firstDueDate: _firstDueDate, ...payloadData } = formData;
    const payload = {
      ...payloadData,
      // Para edição, não incluir datas de vencimento pois não fazem parte da conta
      ...(accountId
        ? {}
        : {
            // Se há dueDates (array), não enviar dueDate (evita conflito no DTO do backend)
            // Se não há dueDates, enviar dueDate (criação de conta única)
            ...(formData.dueDates && formData.dueDates.length > 0
              ? {}
              : { dueDate: formData.dueDate ?? formData.firstDueDate }),
            dueDates: formData.dueDates,
          }),
      // Se categoryId é string vazia, enviar null para remover categoria
      categoryId:
        formData.categoryId === '' ? null : formData.categoryId || undefined,
      tagIds: formData.tagIds?.length ? formData.tagIds : undefined,
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
    deleteInstallmentMutation,
    updateInstallmentMutation,
    submitAccount,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDeletingInstallment: deleteInstallmentMutation.isPending,
    isUpdatingInstallment: updateInstallmentMutation.isPending,
  };
};
