import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { AnimatedPage } from '../../../shared/components';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { PaymentsTable } from '../components';
import { usePayments, usePaymentOperations } from '../hooks/usePayments';
import type { Payment } from '../types';

export const PaymentsPage: React.FC = () => {
  // State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Queries
  const { data: paymentsData, isLoading } = usePayments({
    page: 0,
    rowsPerPage: 100,
  });

  // Mutations
  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedPayment(null);
  }, []);

  const { deleteMutation, isDeleting } = usePaymentOperations({
    onDeleteSuccess: handleCloseDeleteDialog,
  });

  // Handlers
  const handleDelete = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  }, []);

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
          subtitle="Histórico de pagamentos e recebimentos"
        />

        <PaymentsTable
          payments={payments}
          isLoading={isLoading}
          onDelete={handleDelete}
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
