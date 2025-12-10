import React, { useState, useCallback } from 'react';
import { Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AnimatedPage } from '../../../shared/components';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  ReceivablesTable,
  ReceivableFormDialog,
  ReceivableFilters,
} from '../components';
import {
  useReceivables,
  useCustomers,
  useReceivableCategories,
  useTags,
  useReceivableOperations,
} from '../hooks/useReceivables';
import type { Receivable, ReceivableFormData } from '../types';

export const ReceivablesPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] =
    useState<Receivable | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Queries
  const {
    data: receivablesData,
    isLoading,
    error,
  } = useReceivables({ status: statusFilter, page, rowsPerPage });

  const { data: customers = [] } = useCustomers();
  const { data: categories = [] } = useReceivableCategories();
  const { data: tags = [] } = useTags();

  // Mutations
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedReceivable(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedReceivable(null);
  }, []);

  const { submitReceivable, deleteMutation, isSubmitting, isDeleting } =
    useReceivableOperations({
      onCreateSuccess: handleCloseDialog,
      onUpdateSuccess: handleCloseDialog,
      onDeleteSuccess: handleCloseDeleteDialog,
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
    (receivable: Receivable) => {
      navigate(`/payments?receivableId=${receivable.id}`);
    },
    [navigate]
  );

  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
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
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onEdit={handleOpenDialog}
          onDelete={handleDelete}
          onPayment={handlePayment}
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
          message={`Tem certeza que deseja excluir a conta "${selectedReceivable?.description}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={handleCloseDeleteDialog}
          isLoading={isDeleting}
        />
      </Box>
    </AnimatedPage>
  );
};
