import { useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type {
  DashboardData,
  DashboardInstallmentItem,
  PaymentMethod,
  UpdateInstallmentInput,
} from '@lib/types';
import { usePayable } from '../payables/use-payable';
import { useReceivable } from '../receivables/use-receivable';
import { useUpdatePayableInstallment } from '../payables/use-update-payable-installment';
import { useUpdateReceivableInstallment } from '../receivables/use-update-receivable-installment';

export function useDashboard() {
  const user = useAuthStore(state => state.user);
  const organizationId = user?.currentOrganization?.id;
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] =
    useState<DashboardInstallmentItem | null>(null);
  const [selectedType, setSelectedType] = useState<'payable' | 'receivable'>(
    'payable'
  );

  // Edit installment state
  const [editItem, setEditItem] = useState<DashboardInstallmentItem | null>(
    null
  );
  const [editType, setEditType] = useState<'payable' | 'receivable'>('payable');

  const query = useQuery({
    queryKey: ['dashboard', organizationId],
    queryFn: async () => {
      const response = await api.get<DashboardData>('/dashboard');
      return response.data;
    },
    enabled: !!organizationId,
  });

  // Lazy detail queries — only fetch when the user opens the edit sheet
  const payableDetailQuery = usePayable(
    editItem && editType === 'payable' ? editItem.id : undefined
  );
  const receivableDetailQuery = useReceivable(
    editItem && editType === 'receivable' ? editItem.id : undefined
  );

  // Derive the specific installment from the detail once loaded
  const editInstallment = useMemo(() => {
    if (!editItem?.installmentId) return null;
    const detail =
      editType === 'payable'
        ? payableDetailQuery.data
        : receivableDetailQuery.data;
    if (!detail) return null;
    return (
      detail.installments.find(i => i.id === editItem.installmentId) ?? null
    );
  }, [editItem, editType, payableDetailQuery.data, receivableDetailQuery.data]);

  const updatePayableMutation = useUpdatePayableInstallment(() => {
    setEditItem(null);
  });
  const updateReceivableMutation = useUpdateReceivableInstallment(() => {
    setEditItem(null);
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

  function selectEdit(
    item: DashboardInstallmentItem,
    type: 'payable' | 'receivable'
  ) {
    setEditType(type);
    setEditItem(item);
  }

  function handleEditSubmit(data: UpdateInstallmentInput) {
    if (!editItem?.installmentId) return;
    if (editType === 'payable') {
      updatePayableMutation.mutate({
        payableId: editItem.id,
        installmentId: editItem.installmentId,
        data,
      });
    } else {
      updateReceivableMutation.mutate({
        receivableId: editItem.id,
        installmentId: editItem.installmentId,
        data,
      });
    }
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
    // Edit installment
    editItem,
    editInstallment,
    editType,
    isLoadingDetail:
      payableDetailQuery.isFetching || receivableDetailQuery.isFetching,
    isUpdating:
      updatePayableMutation.isPending || updateReceivableMutation.isPending,
    selectEdit,
    clearEdit: () => setEditItem(null),
    handleEditSubmit,
  };
}
