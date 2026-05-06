import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type {
  CreateInstallmentItemInput,
  UpdateInstallmentItemInput,
} from '@lib/types';
import { installmentItemsQueryKey } from './use-installment-items';

interface ItemMutationVars {
  payableId: string;
  installmentId: string;
}

interface CreateItemVars extends ItemMutationVars {
  data: CreateInstallmentItemInput;
}

interface UpdateItemVars extends ItemMutationVars {
  itemId: string;
  data: UpdateInstallmentItemInput;
}

interface DeleteItemVars extends ItemMutationVars {
  itemId: string;
}

export interface InstallmentCapacityError {
  code: 'INSTALLMENT_CAPACITY_EXCEEDED';
  affectedInstallments: Array<{
    installmentNumber: number;
    currentAmount: number;
    neededAmount: number;
  }>;
}

function getErrorCode(error: unknown): string | undefined {
  return (
    error as {
      response?: { data?: { code?: string } };
    }
  )?.response?.data?.code;
}

export function useInstallmentItemMutations(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  function invalidate(payableId: string, installmentId: string) {
    queryClient.invalidateQueries({
      queryKey: installmentItemsQueryKey(
        organizationId,
        payableId,
        installmentId
      ),
    });
    queryClient.invalidateQueries({
      queryKey: ['payable', organizationId, payableId],
    });
    queryClient.invalidateQueries({ queryKey: ['payables', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] });
  }

  const createMutation = useMutation({
    mutationFn: async ({ payableId, installmentId, data }: CreateItemVars) => {
      const response = await api.post(
        `/payables/${payableId}/installments/${installmentId}/items`,
        data
      );
      return response.data;
    },
    onSuccess: (_result, { payableId, installmentId }) => {
      invalidate(payableId, installmentId);
      onSuccess?.();
    },
    onError: (error: unknown, _vars) => {
      const code = getErrorCode(error);
      // INSTALLMENT_CAPACITY_EXCEEDED is handled by the caller (AddEditItemSheet)
      if (
        code === 'INSTALLMENT_CAPACITY_EXCEEDED' ||
        code === 'PAID_INSTALLMENT_CANNOT_BE_ADJUSTED'
      ) {
        return;
      }
      Alert.alert('Erro', 'Não foi possível criar o item. Tente novamente.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      payableId,
      installmentId,
      itemId,
      data,
    }: UpdateItemVars) => {
      const response = await api.patch(
        `/payables/${payableId}/installments/${installmentId}/items/${itemId}`,
        data
      );
      return response.data;
    },
    onSuccess: (_result, { payableId, installmentId }) => {
      invalidate(payableId, installmentId);
      onSuccess?.();
    },
    onError: () => {
      Alert.alert(
        'Erro',
        'Não foi possível atualizar o item. Tente novamente.'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      payableId,
      installmentId,
      itemId,
    }: DeleteItemVars) => {
      const response = await api.delete(
        `/payables/${payableId}/installments/${installmentId}/items/${itemId}`
      );
      return response.data;
    },
    onSuccess: (_result, { payableId, installmentId }) => {
      invalidate(payableId, installmentId);
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível excluir o item. Tente novamente.');
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
}
