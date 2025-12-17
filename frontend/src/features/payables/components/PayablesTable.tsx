import React from 'react';
import { AccountsTable } from '../../../shared/components/AccountsTable';
import type { Payable } from '../types';
import type { AccountTableConfig } from '../../../shared/types/account.types';

interface PayablesTableProps {
  payables: Payable[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (payable: Payable) => void;
  onDelete: (payable: Payable) => void;
  onPayment: (payable: Payable) => void;
  onViewPayments?: (payable: Payable) => void;
}

const payablesConfig: AccountTableConfig = {
  type: 'payable',
  entityLabel: 'Credor',
  entityFieldLabel: 'Credor',
  amountFieldLabel: 'Pago',
  emptyTitle: 'Nenhuma conta a pagar',
  emptyDescription: 'Crie sua primeira conta a pagar para começar',
};

export const PayablesTable: React.FC<PayablesTableProps> = ({
  payables,
  totalCount,
  page,
  rowsPerPage,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onPayment,
  onViewPayments,
}) => {
  return (
    <AccountsTable
      accounts={payables}
      totalCount={totalCount}
      page={page}
      rowsPerPage={rowsPerPage}
      isLoading={isLoading}
      config={payablesConfig}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      onEdit={onEdit}
      onDelete={onDelete}
      onPayment={onPayment}
      onViewPayments={onViewPayments}
    />
  );
};
