import React, { useState, useCallback } from 'react';
import { Box, Alert } from '@mui/material';
import { AnimatedPage } from '../../../shared/components';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { PaymentHistoryDialog } from '../../../shared/components/PaymentHistoryDialog';
import {
  PayablesTable,
  PayableFormDialog,
  PayableFilters,
} from '../components';
import {
  usePayables,
  useVendors,
  useCategories,
  useTags,
  usePayableOperations,
} from '../hooks/usePayables';
import {
  usePayablePayments,
  usePaymentOperations,
} from '../../payments/hooks/usePayments';
import { QuickPaymentDialog } from '../../payments/components';
import type { Payable, PayableFormData, PayableInstallment } from '../types';
import type { PaymentFormData } from '../../payments/types';

export const PayablesPage: React.FC = () => {
  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] =
    useState(false);
  const [quickPaymentDialogOpen, setQuickPaymentDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [selectedInstallment, setSelectedInstallment] =
    useState<PayableInstallment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Queries
  const {
    data: payablesData,
    isLoading,
    error,
  } = usePayables({
    status: statusFilter,
    vendorId: vendorFilter,
    categoryId: categoryFilter,
    tagIds: tagFilters,
    page,
    rowsPerPage,
  });

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  // Payment history query - only fetch when dialog is open
  const { data: payments = [], isLoading: isLoadingPayments } =
    usePayablePayments(
      paymentHistoryDialogOpen ? selectedPayable?.id : undefined
    );

  // Mutations
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedPayable(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedPayable(null);
  }, []);

  const handleCloseQuickPaymentDialog = useCallback(() => {
    setQuickPaymentDialogOpen(false);
    setSelectedInstallment(null);
  }, []);

  const handleClosePaymentHistoryDialog = useCallback(() => {
    setPaymentHistoryDialogOpen(false);
    // Don't clear selectedPayable here to keep the data loaded
  }, []);

  const { submitPayable, deleteMutation, isSubmitting, isDeleting } =
    usePayableOperations({
      onCreateSuccess: handleCloseDialog,
      onUpdateSuccess: handleCloseDialog,
      onDeleteSuccess: handleCloseDeleteDialog,
    });

  const { createMutation, isCreating } = usePaymentOperations({
    onCreateSuccess: handleCloseQuickPaymentDialog,
  });

  // Handlers
  const handleOpenDialog = useCallback((payable?: Payable) => {
    setSelectedPayable(payable || null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((payable: Payable) => {
    setSelectedPayable(payable);
    setDeleteDialogOpen(true);
  }, []);

  const handlePayment = useCallback((item: Payable | PayableInstallment) => {
    if ('installmentNumber' in item) {
      // It's an installment - open quick payment dialog
      setSelectedInstallment(item);
      setQuickPaymentDialogOpen(true);
    } else if (item.installments && item.installments.length > 0) {
      // It's a payable, use the first installment
      setSelectedInstallment(item.installments[0]);
      setQuickPaymentDialogOpen(true);
    }
  }, []);

  const handleQuickPaymentSubmit = useCallback(
    (data: PaymentFormData) => {
      createMutation.mutate(data);
    },
    [createMutation]
  );

  const handleViewPayments = useCallback((payable: Payable) => {
    setSelectedPayable(payable);
    setPaymentHistoryDialogOpen(true);
  }, []);

  const handleStatusChange = useCallback((status: string[]) => {
    setStatusFilter(status);
    setPage(0);
  }, []);

  const handleVendorChange = useCallback((vendorId: string | null) => {
    setVendorFilter(vendorId);
    setPage(0);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string | null) => {
    setCategoryFilter(categoryId);
    setPage(0);
  }, []);

  const handleTagsChange = useCallback((tagIds: string[]) => {
    setTagFilters(tagIds);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const handleSubmit = useCallback(
    (data: PayableFormData) => {
      submitPayable(data, selectedPayable?.id);
    },
    [submitPayable, selectedPayable]
  );

  const confirmDelete = useCallback(() => {
    if (selectedPayable) {
      deleteMutation.mutate(selectedPayable.id);
    }
  }, [deleteMutation, selectedPayable]);

  const payables = payablesData?.data || [];
  const totalCount = payablesData?.total || 0;

  return (
    <AnimatedPage>
      <Box>
        <PageHeader
          title="Contas a Pagar"
          subtitle="Gerencie suas obrigações financeiras"
          action={{ label: 'Nova Conta', onClick: () => handleOpenDialog() }}
        />

        <PayableFilters
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          vendorFilter={vendorFilter}
          onVendorChange={handleVendorChange}
          vendors={vendors}
          categoryFilter={categoryFilter}
          onCategoryChange={handleCategoryChange}
          categories={categories}
          tagFilters={tagFilters}
          onTagsChange={handleTagsChange}
          tags={tags}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Erro ao carregar contas a pagar: {error.message}
          </Alert>
        )}

        <PayablesTable
          payables={payables}
          totalCount={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onEdit={handleOpenDialog}
          onDelete={handleDelete}
          onPayment={handlePayment}
          onViewPayments={handleViewPayments}
        />

        <PayableFormDialog
          open={dialogOpen}
          payable={selectedPayable}
          vendors={vendors}
          categories={categories}
          tags={tags}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onClose={handleCloseDialog}
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          title="Excluir Conta a Pagar"
          message={`Tem certeza que deseja excluir a conta "${selectedPayable?.description}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={handleCloseDeleteDialog}
          isLoading={isDeleting}
        />

        <PaymentHistoryDialog
          open={paymentHistoryDialogOpen}
          onClose={handleClosePaymentHistoryDialog}
          accountType="payable"
          accountData={
            selectedPayable
              ? {
                  id: selectedPayable.id,
                  description: selectedPayable.description,
                  amount: selectedPayable.amount,
                  paidAmount: selectedPayable.paidAmount,
                  dueDate: selectedPayable.dueDate,
                  entityName: selectedPayable.vendor.name,
                  status: selectedPayable.status,
                }
              : null
          }
          payments={payments}
          isLoading={isLoadingPayments}
        />

        <QuickPaymentDialog
          open={quickPaymentDialogOpen}
          installment={selectedInstallment}
          type="PAYABLE"
          isSubmitting={isCreating}
          onSubmit={handleQuickPaymentSubmit}
          onClose={handleCloseQuickPaymentDialog}
        />
      </Box>
    </AnimatedPage>
  );
};
