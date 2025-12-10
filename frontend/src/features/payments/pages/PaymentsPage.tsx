import React, { useState, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { AnimatedPage } from '../../../shared/components';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { PaymentsTable, PaymentFormDialog } from '../components';
import {
  usePayments,
  usePendingPayables,
  usePendingReceivables,
  usePaymentOperations,
} from '../hooks/usePayments';
import type { Payment, PaymentFormData, PaymentType } from '../types';

export const PaymentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('PAYABLE');

  const preSelectedPayableId = searchParams.get('payableId');
  const preSelectedReceivableId = searchParams.get('receivableId');

  // Queries
  const { data: paymentsData, isLoading } = usePayments({
    page: 0,
    rowsPerPage: 100,
  });
  const { data: pendingPayables = [] } = usePendingPayables();
  const { data: pendingReceivables = [] } = usePendingReceivables();

  // Mutations
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    window.history.replaceState({}, '', '/payments');
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedPayment(null);
  }, []);

  const { createMutation, deleteMutation, isCreating, isDeleting } =
    usePaymentOperations({
      onCreateSuccess: handleCloseDialog,
      onDeleteSuccess: handleCloseDeleteDialog,
    });

  // Open dialog with pre-selected account from URL params
  useEffect(() => {
    if (preSelectedPayableId || preSelectedReceivableId) {
      setPaymentType(preSelectedPayableId ? 'PAYABLE' : 'RECEIVABLE');
      setDialogOpen(true);
    }
  }, [preSelectedPayableId, preSelectedReceivableId]);

  // Handlers
  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (data: PaymentFormData) => {
      createMutation.mutate(data);
    },
    [createMutation]
  );

  const confirmDelete = useCallback(() => {
    if (selectedPayment) {
      deleteMutation.mutate(selectedPayment.id);
    }
  }, [deleteMutation, selectedPayment]);

  const payments = paymentsData?.data || [];

  return (
    <AnimatedPage>
      <Box>
        <PageHeader
          title="Pagamentos"
          subtitle="Registre pagamentos e recebimentos"
          action={{ label: 'Novo Pagamento', onClick: handleOpenDialog }}
        />

        <PaymentsTable
          payments={payments}
          isLoading={isLoading}
          onDelete={handleDelete}
        />

        <PaymentFormDialog
          open={dialogOpen}
          paymentType={paymentType}
          pendingPayables={pendingPayables}
          pendingReceivables={pendingReceivables}
          preSelectedPayableId={preSelectedPayableId}
          preSelectedReceivableId={preSelectedReceivableId}
          isSubmitting={isCreating}
          onPaymentTypeChange={setPaymentType}
          onSubmit={handleSubmit}
          onClose={handleCloseDialog}
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          title="Excluir Pagamento"
          message="Tem certeza que deseja excluir este pagamento? O saldo da conta será restaurado."
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={handleCloseDeleteDialog}
          isLoading={isDeleting}
        />
      </Box>
    </AnimatedPage>
  );
};
