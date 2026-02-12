import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { AnimatedPage } from '../../../shared/components';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  PaymentsTable,
  PaymentFilters,
  EditPaymentDialog,
} from '../components';
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Queries
  const { data: paymentsData, isLoading } = usePayments({
    paymentMethod: methodFilter,
    type: typeFilter,
    vendorId: vendorFilter,
    customerId: customerFilter,
    paymentDateFrom: dateFromFilter,
    paymentDateTo: dateToFilter,
    page,
    rowsPerPage,
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

  // Filter handlers - resetam paginação
  const handleMethodChange = useCallback((methods: string[]) => {
    setMethodFilter(methods);
    setPage(0);
  }, []);

  const handleTypeChange = useCallback((type: string | null) => {
    setTypeFilter(type);
    setPage(0);
  }, []);

  const handleVendorChange = useCallback((vendorId: string | null) => {
    setVendorFilter(vendorId);
    setPage(0);
  }, []);

  const handleCustomerChange = useCallback((customerId: string | null) => {
    setCustomerFilter(customerId);
    setPage(0);
  }, []);

  const handleDateFromChange = useCallback((date: string | null) => {
    setDateFromFilter(date);
    setPage(0);
  }, []);

  const handleDateToChange = useCallback((date: string | null) => {
    setDateToFilter(date);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const payments = paymentsData?.data || [];
  const total = paymentsData?.total || 0;

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
          onEdit={handleEdit}
          onDelete={handleDelete}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_e, newPage) => handlePageChange(newPage)}
          onRowsPerPageChange={e =>
            handleRowsPerPageChange(Number.parseInt(e.target.value, 10))
          }
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
