import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useUIStore } from '../../../lib/stores/uiStore';
import type {
  PaymentFormData,
  PaymentsResponse,
  Payable,
  Receivable,
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
  page: number;
  rowsPerPage: number;
}

export const usePayments = ({ page, rowsPerPage }: UsePaymentsParams) => {
  return useQuery({
    queryKey: paymentKeys.list({ page, rowsPerPage }),
    queryFn: async (): Promise<PaymentsResponse> => {
      const response = await api.get('/payments');
      return response.data;
    },
  });
};

// ============================================================
// Pending Accounts Queries
// ============================================================

export const usePendingPayables = () => {
  return useQuery({
    queryKey: ['payables', 'pending'],
    queryFn: async (): Promise<Payable[]> => {
      const response = await api.get('/payables', {
        params: { status: 'PENDING,PARTIAL,OVERDUE' },
      });
      return response.data.data || response.data;
    },
  });
};

export const usePendingReceivables = () => {
  return useQuery({
    queryKey: ['receivables', 'pending'],
    queryFn: async (): Promise<Receivable[]> => {
      const response = await api.get('/receivables', {
        params: { status: 'PENDING,PARTIAL,OVERDUE' },
      });
      return response.data.data || response.data;
    },
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
        paymentDate: data.paymentDate,
        paymentMethod: data.method,
        notes: data.notes || undefined,
        allocations: [
          {
            amount: data.amount,
            ...(data.payableId && { payableId: data.payableId }),
            ...(data.receivableId && { receivableId: data.receivableId }),
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
