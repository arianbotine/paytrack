import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type { UpdateInstallmentInput } from '@lib/types';

export interface UpdatePayableInstallmentInput {
  payableId: string;
  installmentId: string;
  data: UpdateInstallmentInput;
}

export function useUpdatePayableInstallment(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useMutation({
    mutationFn: async ({
      payableId,
      installmentId,
      data,
    }: UpdatePayableInstallmentInput) => {
      const response = await api.patch(
        `/payables/${payableId}/installments/${installmentId}`,
        data
      );
      return response.data;
    },
    onSuccess: (_result, { payableId }) => {
      queryClient.invalidateQueries({ queryKey: ['payables', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['payable', organizationId, payableId],
      });
      onSuccess?.();
    },
    onError: (err: Error) => {
      Alert.alert(
        'Erro',
        err.message || 'Não foi possível atualizar a parcela.'
      );
    },
  });
}
