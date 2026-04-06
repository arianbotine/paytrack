import { useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type {
  DashboardData,
  DashboardInstallmentItem,
  PaymentMethod,
} from '@lib/types';

export function useDashboard() {
  const user = useAuthStore(state => state.user);
  const organizationId = user?.currentOrganization?.id;
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] =
    useState<DashboardInstallmentItem | null>(null);
  const [selectedType, setSelectedType] = useState<'payable' | 'receivable'>(
    'payable'
  );

  const query = useQuery({
    queryKey: ['dashboard', organizationId],
    queryFn: async () => {
      const response = await api.get<DashboardData>('/dashboard');
      return response.data;
    },
    enabled: !!organizationId,
  });

  const payMutation = useMutation({
    mutationFn: async ({
      payableId,
      installmentId,
      amount,
      paymentMethod,
    }: {
      payableId: string;
      installmentId: string;
      amount: number;
      paymentMethod: PaymentMethod;
    }) => {
      const response = await api.post(
        `/payables/${payableId}/installments/${installmentId}/pay`,
        {
          amount,
          paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setSelectedItem(null);
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ['payables', organizationId] });
    },
    onError: (err: Error) => {
      Alert.alert(
        'Erro',
        err.message || 'Não foi possível registrar o pagamento.'
      );
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({
      receivableId,
      installmentId,
      amount,
      paymentMethod,
    }: {
      receivableId: string;
      installmentId: string;
      amount: number;
      paymentMethod: PaymentMethod;
    }) => {
      const response = await api.post(
        `/receivables/${receivableId}/installments/${installmentId}/receive`,
        {
          amount,
          paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setSelectedItem(null);
      queryClient.invalidateQueries({
        queryKey: ['dashboard', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['receivables', organizationId],
      });
    },
    onError: (err: Error) => {
      Alert.alert(
        'Erro',
        err.message || 'Não foi possível registrar o recebimento.'
      );
    },
  });

  function handleConfirm(amount: number, method: PaymentMethod) {
    if (!selectedItem?.installmentId) return;
    if (selectedType === 'payable') {
      payMutation.mutate({
        payableId: selectedItem.id,
        installmentId: selectedItem.installmentId,
        amount,
        paymentMethod: method,
      });
    } else {
      receiveMutation.mutate({
        receivableId: selectedItem.id,
        installmentId: selectedItem.installmentId,
        amount,
        paymentMethod: method,
      });
    }
  }

  function selectItem(
    item: DashboardInstallmentItem,
    type: 'payable' | 'receivable'
  ) {
    setSelectedType(type);
    setSelectedItem(item);
  }

  return {
    user,
    query,
    selectedItem,
    selectedType,
    isMutating: payMutation.isPending || receiveMutation.isPending,
    selectItem,
    clearSelection: () => setSelectedItem(null),
    handleConfirm,
  };
}
