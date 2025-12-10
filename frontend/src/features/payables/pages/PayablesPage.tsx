import React, { useState, useCallback } from "react";
import { Box, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AnimatedPage } from "../../../shared/components";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import {
  PayablesTable,
  PayableFormDialog,
  PayableFilters,
} from "../components";
import {
  usePayables,
  useVendors,
  useCategories,
  useTags,
  usePayableOperations,
} from "../hooks/usePayables";
import type { Payable, PayableFormData } from "../types";

export const PayablesPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Queries
  const {
    data: payablesData,
    isLoading,
    error,
  } = usePayables({ status: statusFilter, page, rowsPerPage });

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  // Mutations
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedPayable(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedPayable(null);
  }, []);

  const { submitPayable, deleteMutation, isSubmitting, isDeleting } =
    usePayableOperations({
      onCreateSuccess: handleCloseDialog,
      onUpdateSuccess: handleCloseDialog,
      onDeleteSuccess: handleCloseDeleteDialog,
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

  const handlePayment = useCallback(
    (payable: Payable) => {
      navigate(`/payments?payableId=${payable.id}`);
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
          action={{ label: "Nova Conta", onClick: () => handleOpenDialog() }}
        />

        <PayableFilters
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
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
      </Box>
    </AnimatedPage>
  );
};
