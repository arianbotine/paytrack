import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useUIStore } from '../../../lib/stores/uiStore';
import { toUTCDatetime } from '../../../shared/utils/dateUtils';
import type {
  PaymentFormData,
  PaymentsResponse,
  PaymentHistoryItem,
} from '../types';

// ============================================================
// Query Keys
// ============================================================

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...paymentKeys.lists(), filters] as const,
};

// ============================================================
// Payments Query
// ============================================================

interface UsePaymentsParams {
  paymentMethod?: string[];
  type?: string | null;
  vendorId?: string | null;
  customerId?: string | null;
  paymentDateFrom?: string | null;
  paymentDateTo?: string | null;
  page: number;
  rowsPerPage: number;
}

export const usePayments = (params: UsePaymentsParams) => {
  return useQuery({
    queryKey: paymentKeys.list({
      paymentMethod: params.paymentMethod,
      type: params.type,
      vendorId: params.vendorId,
      customerId: params.customerId,
      paymentDateFrom: params.paymentDateFrom,
      paymentDateTo: params.paymentDateTo,
      page: params.page,
      rowsPerPage: params.rowsPerPage,
    }),
    queryFn: async (): Promise<PaymentsResponse> => {
      const queryParams = new URLSearchParams();

      if (params.paymentMethod && params.paymentMethod.length > 0) {
        queryParams.append('paymentMethod', params.paymentMethod.join(','));
      }
      if (params.type) {
        queryParams.append('type', params.type);
      }
      if (params.vendorId) {
        queryParams.append('vendorId', params.vendorId);
      }
      if (params.customerId) {
        queryParams.append('customerId', params.customerId);
      }
      if (params.paymentDateFrom) {
        queryParams.append('paymentDateFrom', params.paymentDateFrom);
      }
      if (params.paymentDateTo) {
        queryParams.append('paymentDateTo', params.paymentDateTo);
      }

      const skip = params.page * params.rowsPerPage;
      queryParams.append('skip', skip.toString());
      queryParams.append('take', params.rowsPerPage.toString());

      const response = await api.get(`/payments?${queryParams.toString()}`);
      return response.data;
    },
  });
};

// ============================================================
// Payment History Queries
// ============================================================

export const usePayablePayments = (payableId: string | undefined) => {
  return useQuery({
    queryKey: ['payables', payableId, 'payments'],
    queryFn: async (): Promise<PaymentHistoryItem[]> => {
      if (!payableId) return [];
      const response = await api.get(`/payables/${payableId}/payments`);
      return response.data;
    },
    enabled: !!payableId,
  });
};

export const useReceivablePayments = (receivableId: string | undefined) => {
  return useQuery({
    queryKey: ['receivables', receivableId, 'payments'],
    queryFn: async (): Promise<PaymentHistoryItem[]> => {
      if (!receivableId) return [];
      const response = await api.get(`/receivables/${receivableId}/payments`);
      return response.data;
    },
    enabled: !!receivableId,
  });
};

// ============================================================
// Mutations
// ============================================================

export const useCreatePayment = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: PaymentFormData) => {
      const payload = {
        amount: data.amount,
        paymentDate: toUTCDatetime(data.paymentDate), // Converte data/hora local para UTC
        paymentMethod: data.method,
        notes: data.notes || undefined,
        allocations: [
          {
            amount: data.amount,
            ...(data.payableInstallmentId && {
              payableInstallmentId: data.payableInstallmentId,
            }),
            ...(data.receivableInstallmentId && {
              receivableInstallmentId: data.receivableInstallmentId,
            }),
          },
        ],
      };
      return api.post('/payments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification('Pagamento registrado com sucesso!', 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification('Erro ao registrar pagamento', 'error');
    },
  });
};

export const useDeletePayment = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showNotification('Pagamento excluído com sucesso!', 'success');
      onSuccess?.();
    },
    onError: () => {
      showNotification('Erro ao excluir pagamento', 'error');
    },
  });
};

// ============================================================
// Combined Hook for Payment Operations
// ============================================================

export const usePaymentOperations = (callbacks?: {
  onCreateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}) => {
  const createMutation = useCreatePayment(callbacks?.onCreateSuccess);
  const deleteMutation = useDeletePayment(callbacks?.onDeleteSuccess);

  return {
    createMutation,
    deleteMutation,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
