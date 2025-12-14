import React from 'react';
import { AccountsTable } from '../../../shared/components/AccountsTable';
import type { Receivable } from '../types';
import type { AccountTableConfig } from '../../../shared/types/account.types';

interface ReceivablesTableProps {
  receivables: Receivable[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (receivable: Receivable) => void;
  onDelete: (receivable: Receivable) => void;
  onPayment: (receivable: Receivable) => void;
}

const receivablesConfig: AccountTableConfig = {
  type: 'receivable',
  entityLabel: 'Cliente',
  entityFieldLabel: 'Cliente',
  amountFieldLabel: 'Recebido',
  emptyTitle: 'Nenhuma conta a receber',
  emptyDescription: 'Crie sua primeira conta a receber para começar',
};

export const ReceivablesTable: React.FC<ReceivablesTableProps> = ({
  receivables,
  totalCount,
  page,
  rowsPerPage,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onPayment,
}) => {
  return (
    <AccountsTable
      accounts={receivables}
      totalCount={totalCount}
      page={page}
      rowsPerPage={rowsPerPage}
      isLoading={isLoading}
      config={receivablesConfig}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      onEdit={onEdit}
      onDelete={onDelete}
      onPayment={onPayment}
    />
  );
};
