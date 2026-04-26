import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type { UpdateInstallmentInput } from '@lib/types';

export interface UpdateReceivableInstallmentInput {
  receivableId: string;
  installmentId: string;
  data: UpdateInstallmentInput;
}

export function useUpdateReceivableInstallment(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useMutation({
    mutationFn: async ({
      receivableId,
      installmentId,
      data,
    }: UpdateReceivableInstallmentInput) => {
      const response = await api.patch(
        `/receivables/${receivableId}/installments/${installmentId}`,
        data
      );
      return response.data;
    },
    onSuccess: (_result, { receivableId }) => {
      queryClient.invalidateQueries({
        queryKey: ['receivables', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['receivable', organizationId, receivableId],
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
