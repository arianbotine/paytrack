import React, { useState, useCallback } from 'react';
import { Box, Alert } from '@mui/material';
import { AnimatedPage } from '../../../shared/components';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { PaymentHistoryDialog } from '../../../shared/components/PaymentHistoryDialog';
import {
  ReceivablesTable,
  ReceivableFormDialog,
  ReceivableFilters,
  EditInstallmentDialog,
} from '../components';
import {
  useReceivables,
  useCustomers,
  useReceivableCategories,
  useTags,
  useReceivableOperations,
} from '../hooks/useReceivables';
import {
  useReceivablePayments,
  usePaymentOperations,
} from '../../payments/hooks/usePayments';
import { QuickPaymentDialog } from '../../payments/components';
import type {
  Receivable,
  ReceivableFormData,
  ReceivableInstallment,
} from '../types';
import type { PaymentFormData } from '../../payments/types';

export const ReceivablesPage: React.FC = () => {
  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteInstallmentDialogOpen, setDeleteInstallmentDialogOpen] =
    useState(false);
  const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] =
    useState(false);
  const [quickPaymentDialogOpen, setQuickPaymentDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] =
    useState<Receivable | null>(null);
  const [selectedInstallment, setSelectedInstallment] =
    useState<ReceivableInstallment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [installmentTagFilters, setInstallmentTagFilters] = useState<string[]>(
    []
  );
  const [editInstallmentDialogOpen, setEditInstallmentDialogOpen] =
    useState(false);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(
    null
  );

  // Queries
  const {
    data: receivablesData,
    isLoading,
    error,
  } = useReceivables({
    status: statusFilter,
    customerId: customerFilter,
    categoryId: categoryFilter,
    tagIds: tagFilters,
    installmentTagIds: installmentTagFilters,
    page,
    rowsPerPage,
    hideCompleted,
  });

  const { data: customers = [] } = useCustomers();
  const { data: categories = [] } = useReceivableCategories();
  const { data: tags = [] } = useTags();

  // Payment history - only fetch when dialog is open
  const { data: payments = [], isLoading: isLoadingPayments } =
    useReceivablePayments(
      paymentHistoryDialogOpen ? selectedReceivable?.id : undefined
    );

  // Mutations
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedReceivable(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedReceivable(null);
  }, []);

  const handleCloseDeleteInstallmentDialog = useCallback(() => {
    setDeleteInstallmentDialogOpen(false);
    setSelectedReceivable(null);
    setSelectedInstallment(null);
  }, []);

  const handleCloseQuickPaymentDialog = useCallback(() => {
    setQuickPaymentDialogOpen(false);
    setSelectedInstallment(null);
  }, []);

  const handleViewPayments = useCallback((receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setPaymentHistoryDialogOpen(true);
  }, []);

  const handleClosePaymentHistoryDialog = useCallback(() => {
    setPaymentHistoryDialogOpen(false);
    setSelectedReceivable(null);
  }, []);

  const {
    submitReceivable,
    deleteMutation,
    deleteInstallmentMutation,
    updateInstallmentMutation,
    isSubmitting,
    isDeleting,
    isDeletingInstallment,
  } = useReceivableOperations({
    onCreateSuccess: handleCloseDialog,
    onUpdateSuccess: handleCloseDialog,
    onDeleteSuccess: handleCloseDeleteDialog,
    onDeleteInstallmentSuccess: handleCloseDeleteInstallmentDialog,
    onUpdateInstallmentSuccess: () => {
      setEditInstallmentDialogOpen(false);
      setEditingReceivable(null);
      setSelectedInstallment(null);
    },
  });

  const { createMutation, isCreating } = usePaymentOperations({
    onCreateSuccess: handleCloseQuickPaymentDialog,
  });

  // Handlers
  const handleOpenDialog = useCallback((receivable?: Receivable) => {
    setSelectedReceivable(receivable || null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setDeleteDialogOpen(true);
  }, []);

  const handlePayment = useCallback(
    (item: Receivable | ReceivableInstallment) => {
      if ('installmentNumber' in item) {
        // It's an installment - open quick payment dialog
        setSelectedInstallment(item);
        setQuickPaymentDialogOpen(true);
      } else if (item.installments && item.installments.length > 0) {
        // It's a receivable, use the first installment
        setSelectedInstallment(item.installments[0]);
        setQuickPaymentDialogOpen(true);
      }
    },
    []
  );

  const handleQuickPaymentSubmit = useCallback(
    (data: PaymentFormData) => {
      createMutation.mutate(data);
    },
    [createMutation]
  );

  const handleStatusChange = useCallback((status: string[]) => {
    setStatusFilter(status);
    setPage(0);
  }, []);

  const handleCustomerChange = useCallback((customerId: string | null) => {
    setCustomerFilter(customerId);
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

  const handleHideCompletedChange = useCallback((hide: boolean) => {
    setHideCompleted(hide);
    setPage(0);
  }, []);

  const handleSubmit = useCallback(
    (data: ReceivableFormData) => {
      submitReceivable(data, selectedReceivable?.id);
    },
    [submitReceivable, selectedReceivable]
  );

  const confirmDelete = useCallback(() => {
    if (selectedReceivable) {
      deleteMutation.mutate(selectedReceivable.id);
    }
  }, [deleteMutation, selectedReceivable]);

  const handleDeleteInstallment = useCallback(
    (receivable: Receivable, installment: ReceivableInstallment) => {
      setSelectedReceivable(receivable);
      setSelectedInstallment(installment);
      setDeleteInstallmentDialogOpen(true);
    },
    []
  );

  const confirmDeleteInstallment = useCallback(() => {
    if (selectedReceivable && selectedInstallment) {
      deleteInstallmentMutation.mutate({
        accountId: selectedReceivable.id,
        installmentId: selectedInstallment.id,
      });
    }
  }, [deleteInstallmentMutation, selectedReceivable, selectedInstallment]);

  const handleUpdateInstallment = useCallback(
    (
      receivable: Receivable,
      installment: ReceivableInstallment,
      newAmount: number
    ) => {
      updateInstallmentMutation.mutate({
        accountId: receivable.id,
        installmentId: installment.id,
        data: { amount: newAmount },
      });
    },
    [updateInstallmentMutation]
  );

  const handleUpdateInstallmentDueDate = useCallback(
    (
      receivable: Receivable,
      installment: ReceivableInstallment,
      newDueDate: string
    ) => {
      updateInstallmentMutation.mutate({
        accountId: receivable.id,
        installmentId: installment.id,
        data: { dueDate: newDueDate },
      });
    },
    [updateInstallmentMutation]
  );

  const handleEditInstallment = useCallback(
    (receivable: Receivable, installment: ReceivableInstallment) => {
      setEditingReceivable(receivable);
      setSelectedInstallment(installment);
      setEditInstallmentDialogOpen(true);
    },
    []
  );

  const handleEditInstallmentSubmit = useCallback(
    (data: {
      amount?: number;
      dueDate?: string;
      notes?: string;
      tagIds?: string[];
    }) => {
      if (editingReceivable && selectedInstallment) {
        updateInstallmentMutation.mutate({
          accountId: editingReceivable.id,
          installmentId: selectedInstallment.id,
          data,
        });
      }
    },
    [updateInstallmentMutation, editingReceivable, selectedInstallment]
  );

  const receivables = receivablesData?.data || [];
  const totalCount = receivablesData?.total || 0;

  return (
    <AnimatedPage>
      <Box>
        <PageHeader
          title="Contas a Receber"
          subtitle="Gerencie seus recebimentos"
          action={{ label: 'Nova Conta', onClick: () => handleOpenDialog() }}
        />

        <ReceivableFilters
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          customerFilter={customerFilter}
          onCustomerChange={handleCustomerChange}
          customers={customers}
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
            Erro ao carregar contas a receber: {error.message}
          </Alert>
        )}

        <ReceivablesTable
          receivables={receivables}
          totalCount={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          isLoading={isLoading}
          hideCompleted={hideCompleted}
          onHideCompletedChange={handleHideCompletedChange}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onEdit={handleOpenDialog}
          onDelete={handleDelete}
          onPayment={handlePayment}
          onViewPayments={handleViewPayments}
          onDeleteInstallment={handleDeleteInstallment}
          onUpdateInstallment={handleUpdateInstallment}
          onUpdateInstallmentDueDate={handleUpdateInstallmentDueDate}
          onEditInstallment={handleEditInstallment}
        />

        <ReceivableFormDialog
          open={dialogOpen}
          receivable={selectedReceivable}
          customers={customers}
          categories={categories}
          tags={tags}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onClose={handleCloseDialog}
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          title="Excluir Conta a Receber"
          message={`Tem certeza que deseja excluir a conta de "${selectedReceivable?.customer.name}"? Esta ação não pode ser desfeita.`}
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
          accountType="receivable"
          accountData={
            selectedReceivable
              ? {
                  id: selectedReceivable.id,
                  amount: selectedReceivable.amount,
                  paidAmount: selectedReceivable.receivedAmount,
                  entityName: selectedReceivable.customer.name,
                  status: selectedReceivable.status,
                }
              : null
          }
          payments={payments}
          isLoading={isLoadingPayments}
        />

        <QuickPaymentDialog
          open={quickPaymentDialogOpen}
          installment={selectedInstallment}
          type="RECEIVABLE"
          isSubmitting={isCreating}
          onSubmit={handleQuickPaymentSubmit}
          onClose={handleCloseQuickPaymentDialog}
        />

        <EditInstallmentDialog
          open={editInstallmentDialogOpen}
          installment={selectedInstallment}
          receivable={editingReceivable}
          tags={tags}
          isSubmitting={updateInstallmentMutation.isPending}
          onSubmit={handleEditInstallmentSubmit}
          onClose={() => {
            setEditInstallmentDialogOpen(false);
            setEditingReceivable(null);
            setSelectedInstallment(null);
          }}
        />
      </Box>
    </AnimatedPage>
  );
};
