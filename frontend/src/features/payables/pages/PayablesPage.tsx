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
  usePayableInstallmentItems,
  usePayableInstallmentItemOperations,
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
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [installmentTagFilters, setInstallmentTagFilters] = useState<string[]>(
    []
  );
  const [nextDueMonth, setNextDueMonth] = useState<string | null>(null);

  // Helper para calcular data de ontem em formato YYYY-MM-DD
  const getYesterdayDate = (): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // Queries
  const {
    data: payables,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePayables({
    status: statusFilter,
    vendorId: vendorFilter,
    categoryId: categoryFilter,
    tagIds: tagFilters,
    installmentTagIds: installmentTagFilters,
    installmentDueDateTo: showOverdueOnly ? getYesterdayDate() : undefined,
    nextDueMonth: nextDueMonth || undefined,
  });

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const {
    data: installmentItemsResponse,
    isLoading: isLoadingInstallmentItems,
  } = usePayableInstallmentItems(
    selectedPayable?.id,
    selectedInstallment?.id,
    editInstallmentDialogOpen
  );

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

  const {
    createMutation: createInstallmentItemMutation,
    updateMutation: updateInstallmentItemMutation,
    deleteMutation: deleteInstallmentItemMutation,
    isMutating: isMutatingInstallmentItems,
  } = usePayableInstallmentItemOperations();

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
  }, []);

  const handleVendorChange = useCallback((vendorId: string | null) => {
    setVendorFilter(vendorId);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string | null) => {
    setCategoryFilter(categoryId);
  }, []);

  const handleTagsChange = useCallback((tagIds: string[]) => {
    setTagFilters(tagIds);
  }, []);

  const handleInstallmentTagsChange = useCallback((tagIds: string[]) => {
    setInstallmentTagFilters(tagIds);
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

  const handleCreateInstallmentItem = useCallback(
    (data: { description: string; amount: number; tagIds?: string[] }) => {
      if (!selectedPayable || !selectedInstallment) return;

      createInstallmentItemMutation.mutate({
        payableId: selectedPayable.id,
        installmentId: selectedInstallment.id,
        data,
      });
    },
    [createInstallmentItemMutation, selectedPayable, selectedInstallment]
  );

  const handleUpdateInstallmentItem = useCallback(
    (
      itemId: string,
      data: {
        description?: string;
        amount?: number;
        tagIds?: string[];
      }
    ) => {
      if (!selectedPayable || !selectedInstallment) return;

      updateInstallmentItemMutation.mutate({
        payableId: selectedPayable.id,
        installmentId: selectedInstallment.id,
        itemId,
        data,
      });
    },
    [updateInstallmentItemMutation, selectedPayable, selectedInstallment]
  );

  const handleDeleteInstallmentItem = useCallback(
    (itemId: string) => {
      if (!selectedPayable || !selectedInstallment) return;

      deleteInstallmentItemMutation.mutate({
        payableId: selectedPayable.id,
        installmentId: selectedInstallment.id,
        itemId,
      });
    },
    [deleteInstallmentItemMutation, selectedPayable, selectedInstallment]
  );

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
          showOverdueOnly={showOverdueOnly}
          onShowOverdueOnlyChange={setShowOverdueOnly}
          nextDueMonth={nextDueMonth}
          onNextDueMonthChange={setNextDueMonth}
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
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
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
          message={
            selectedPayable?.paidAmount && selectedPayable.paidAmount > 0
              ? `ATENÇÃO: Esta conta possui pagamentos registrados. A exclusão é IRREVERSÍVEL e removerá permanentemente todos os dados relacionados, incluindo histórico de pagamentos. Tem certeza que deseja prosseguir?`
              : `Tem certeza que deseja excluir a conta de "${selectedPayable?.vendor.name}"? Esta ação não pode ser desfeita.`
          }
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
          installmentItems={installmentItemsResponse?.data || []}
          itemsSummary={installmentItemsResponse?.summary}
          isLoadingItems={isLoadingInstallmentItems}
          isMutatingItems={isMutatingInstallmentItems}
          onCreateItem={handleCreateInstallmentItem}
          onUpdateItem={handleUpdateInstallmentItem}
          onDeleteItem={handleDeleteInstallmentItem}
          onSubmit={handleEditInstallmentSubmit}
          onClose={handleCloseEditInstallmentDialog}
        />
      </Box>
    </AnimatedPage>
  );
};
