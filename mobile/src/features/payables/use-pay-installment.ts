import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '../../lib';
import type { PaymentMethod } from '../../lib/types';

export interface PayInstallmentInput {
  payableId: string;
  installmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
}

export function usePayInstallment(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useMutation({
    mutationFn: async ({
      payableId,
      installmentId,
      amount,
      paymentMethod,
      paymentDate,
    }: PayInstallmentInput) => {
      const response = await api.post(
        `/payables/${payableId}/installments/${installmentId}/pay`,
        { amount, paymentMethod, paymentDate }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      onSuccess?.();
    },
    onError: (err: Error) => {
      Alert.alert(
        'Erro',
        err.message || 'Não foi possível registrar o pagamento.'
      );
    },
  });
}
