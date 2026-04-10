import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '../../lib';
import type { PaymentMethod } from '../../lib/types';

export interface ReceiveInstallmentInput {
  receivableId: string;
  installmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
}

export function useReceiveInstallment(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useMutation({
    mutationFn: async ({
      receivableId,
      installmentId,
      amount,
      paymentMethod,
      paymentDate,
    }: ReceiveInstallmentInput) => {
      const response = await api.post(
        `/receivables/${receivableId}/installments/${installmentId}/receive`,
        { amount, paymentMethod, paymentDate }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['receivables', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      onSuccess?.();
    },
    onError: (err: Error) => {
      Alert.alert(
        'Erro',
        err.message || 'Não foi possível registrar o recebimento.'
      );
    },
  });
}
