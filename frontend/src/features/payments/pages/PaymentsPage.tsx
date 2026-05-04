import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { AnimatedPage } from '../../../shared/components';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { PaymentsTable } from '../components/PaymentsTable';
import { PaymentFilters, EditPaymentDialog } from '../components';
import { usePayments, usePaymentOperations } from '../hooks/usePayments';
import { useVendors } from '../../payables/hooks/usePayables';
import { useCustomers } from '../../receivables/hooks/useReceivables';
import type { Payment } from '../types';

export const PaymentsPage: React.FC = () => {
  // State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Filter states
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>('');
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFromFilter, setDateFromFilter] = useState<string | null>(null);
  const [dateToFilter, setDateToFilter] = useState<string | null>(null);

  // Queries
  const {
    data: payments,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePayments({
    paymentMethod: methodFilter,
    type: typeFilter,
    vendorId: vendorFilter,
    customerId: customerFilter,
    paymentDateFrom: dateFromFilter,
    paymentDateTo: dateToFilter,
  });

  const { data: vendors = [] } = useVendors();
  const { data: customers = [] } = useCustomers();

  // Mutations
  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedPayment(null);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedPayment(null);
  }, []);

  const { deleteMutation, isDeleting } = usePaymentOperations({
    onDeleteSuccess: handleCloseDeleteDialog,
    onUpdateSuccess: handleCloseEditDialog,
  });

  // Handlers
  const handleEdit = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedPayment) {
      deleteMutation.mutate(selectedPayment.id);
    }
  }, [deleteMutation, selectedPayment]);

  const handleMethodChange = useCallback((methods: string[]) => {
    setMethodFilter(methods);
  }, []);

  const handleTypeChange = useCallback((type: string | null) => {
    setTypeFilter(type);
  }, []);

  const handleVendorChange = useCallback((vendorId: string | null) => {
    setVendorFilter(vendorId);
  }, []);

  const handleCustomerChange = useCallback((customerId: string | null) => {
    setCustomerFilter(customerId);
  }, []);

  const handleDateFromChange = useCallback((date: string | null) => {
    setDateFromFilter(date);
  }, []);

  const handleDateToChange = useCallback((date: string | null) => {
    setDateToFilter(date);
  }, []);

  return (
    <AnimatedPage>
      <Box>
        <PageHeader
          title="Pagamentos"
          subtitle="Histórico de pagamentos e recebimentos"
        />

        <PaymentFilters
          methodFilter={methodFilter}
          onMethodChange={handleMethodChange}
          typeFilter={typeFilter}
          onTypeChange={handleTypeChange}
          vendorFilter={vendorFilter}
          onVendorChange={handleVendorChange}
          vendors={vendors}
          customerFilter={customerFilter}
          onCustomerChange={handleCustomerChange}
          customers={customers}
          dateFromFilter={dateFromFilter}
          onDateFromChange={handleDateFromChange}
          dateToFilter={dateToFilter}
          onDateToChange={handleDateToChange}
        />

        <PaymentsTable
          payments={payments}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <EditPaymentDialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          payment={selectedPayment}
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
