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
  EditInstallmentDialog,
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
  const [deleteInstallmentDialogOpen, setDeleteInstallmentDialogOpen] =
    useState(false);
  const [editInstallmentDialogOpen, setEditInstallmentDialogOpen] =
    useState(false);
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
  const [installmentTagFilters, setInstallmentTagFilters] = useState<string[]>(
    []
  );
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
    installmentTagIds: installmentTagFilters,
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

  const handleCloseDeleteInstallmentDialog = useCallback(() => {
    setDeleteInstallmentDialogOpen(false);
    setSelectedPayable(null);
    setSelectedInstallment(null);
  }, []);

  const handleCloseEditInstallmentDialog = useCallback(() => {
    setEditInstallmentDialogOpen(false);
    setSelectedPayable(null);
    setSelectedInstallment(null);
  }, []);

  const handleCloseQuickPaymentDialog = useCallback(() => {
    setQuickPaymentDialogOpen(false);
    setSelectedInstallment(null);
  }, []);

  const handleClosePaymentHistoryDialog = useCallback(() => {
    setPaymentHistoryDialogOpen(false);
    // Don't clear selectedPayable here to keep the data loaded
  }, []);

  const {
    submitPayable,
    deleteMutation,
    deleteInstallmentMutation,
    updateInstallmentMutation,
    isSubmitting,
    isDeleting,
    isDeletingInstallment,
  } = usePayableOperations({
    onCreateSuccess: handleCloseDialog,
    onUpdateSuccess: handleCloseDialog,
    onDeleteSuccess: handleCloseDeleteDialog,
    onDeleteInstallmentSuccess: handleCloseDeleteInstallmentDialog,
    onUpdateInstallmentSuccess: handleCloseEditInstallmentDialog,
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

  const handleInstallmentTagsChange = useCallback((tagIds: string[]) => {
    setInstallmentTagFilters(tagIds);
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

  const handleDeleteInstallment = useCallback(
    (payable: Payable, installment: PayableInstallment) => {
      setSelectedPayable(payable);
      setSelectedInstallment(installment);
      setDeleteInstallmentDialogOpen(true);
    },
    []
  );

  const handleEditInstallment = useCallback(
    (payable: Payable, installment: PayableInstallment) => {
      setSelectedPayable(payable);
      setSelectedInstallment(installment);
      setEditInstallmentDialogOpen(true);
    },
    []
  );

  const confirmDeleteInstallment = useCallback(() => {
    if (selectedPayable && selectedInstallment) {
      deleteInstallmentMutation.mutate({
        accountId: selectedPayable.id,
        installmentId: selectedInstallment.id,
      });
    }
  }, [deleteInstallmentMutation, selectedPayable, selectedInstallment]);

  const handleUpdateInstallment = useCallback(
    (payable: Payable, installment: PayableInstallment, newAmount: number) => {
      updateInstallmentMutation.mutate({
        accountId: payable.id,
        installmentId: installment.id,
        data: { amount: newAmount },
      });
    },
    [updateInstallmentMutation]
  );

  const handleUpdateInstallmentDueDate = useCallback(
    (payable: Payable, installment: PayableInstallment, newDueDate: string) => {
      updateInstallmentMutation.mutate({
        accountId: payable.id,
        installmentId: installment.id,
        data: { dueDate: newDueDate },
      });
    },
    [updateInstallmentMutation]
  );

  const handleEditInstallmentSubmit = useCallback(
    (data: {
      amount?: number;
      dueDate?: string;
      notes?: string;
      tagIds?: string[];
    }) => {
      if (selectedPayable && selectedInstallment) {
        updateInstallmentMutation.mutate({
          accountId: selectedPayable.id,
          installmentId: selectedInstallment.id,
          data,
        });
      }
    },
    [updateInstallmentMutation, selectedPayable, selectedInstallment]
  );

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
          installmentTagFilters={installmentTagFilters}
          onInstallmentTagsChange={handleInstallmentTagsChange}
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
          onDeleteInstallment={handleDeleteInstallment}
          onEditInstallment={handleEditInstallment}
          onUpdateInstallment={handleUpdateInstallment}
          onUpdateInstallmentDueDate={handleUpdateInstallmentDueDate}
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
          message={`Tem certeza que deseja excluir a conta de "${selectedPayable?.vendor.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={handleCloseDeleteDialog}
          isLoading={isDeleting}
        />

        <ConfirmDialog
          open={deleteInstallmentDialogOpen}
          title="Excluir Parcela"
          message={`Tem certeza que deseja excluir a parcela ${selectedInstallment?.installmentNumber}/${selectedInstallment?.totalInstallments} no valor de R$ ${selectedInstallment?.amount.toFixed(2)}? O valor total da conta será recalculado.`}
          confirmLabel="Excluir Parcela"
          onConfirm={confirmDeleteInstallment}
          onCancel={handleCloseDeleteInstallmentDialog}
          isLoading={isDeletingInstallment}
        />

        <PaymentHistoryDialog
          open={paymentHistoryDialogOpen}
          onClose={handleClosePaymentHistoryDialog}
          accountType="payable"
          accountData={
            selectedPayable
              ? {
                  id: selectedPayable.id,
                  amount: selectedPayable.amount,
                  paidAmount: selectedPayable.paidAmount,
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

        <EditInstallmentDialog
          open={editInstallmentDialogOpen}
          installment={selectedInstallment}
          payable={selectedPayable}
          tags={tags}
          isSubmitting={updateInstallmentMutation.isPending}
          onSubmit={handleEditInstallmentSubmit}
          onClose={handleCloseEditInstallmentDialog}
        />
      </Box>
    </AnimatedPage>
  );
};
