import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Typography,
  TablePagination,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusChip } from '../../../shared/components/StatusChip';
import { TableSkeleton, EmptyState } from '../../../shared/components';
import type { Payable } from '../types';
import { formatCurrency } from '../types';

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
}

const getDueDateAlert = (dueDate: string, status: string) => {
  if (status === 'PAID' || status === 'CANCELLED') return null;

  const today = new Date();
  const due = parseISO(dueDate);
  const daysUntilDue = differenceInDays(due, today);

  if (status === 'OVERDUE' || isAfter(today, due)) {
    return (
      <Tooltip title="Conta vencida!">
        <ErrorIcon color="error" fontSize="small" />
      </Tooltip>
    );
  }

  if (daysUntilDue <= 7) {
    return (
      <Tooltip title={`Vence em ${daysUntilDue} dias`}>
        <WarningIcon color="warning" fontSize="small" />
      </Tooltip>
    );
  }

  return null;
};

const MotionTableRow = motion.create(TableRow);

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
}) => {
  return (
    <TableContainer
      component={Paper}
      sx={{ borderRadius: 2, overflow: 'hidden' }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Descrição</TableCell>
            <TableCell>Fornecedor</TableCell>
            <TableCell sx={{ display: { xs: 'none', tablet: 'table-cell' } }}>
              Categoria
            </TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell>Vencimento</TableCell>
            <TableCell>Status</TableCell>
            <TableCell
              align="right"
              sx={{ display: { xs: 'none', tablet: 'table-cell' } }}
            >
              Pago
            </TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && <TableSkeleton columns={8} rows={rowsPerPage} />}
          {!isLoading && payables.length === 0 && (
            <TableRow>
              <TableCell colSpan={8}>
                <EmptyState
                  variant="empty"
                  title="Nenhuma conta a pagar"
                  description="Crie sua primeira conta a pagar para começar"
                />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && payables.length > 0 && (
            <AnimatePresence mode="popLayout">
              {payables.map((payable, index) => (
                <MotionTableRow
                  key={payable.id}
                  hover
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                >
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                      }}
                    >
                      <Typography fontWeight="medium">
                        {payable.description}
                      </Typography>
                      {payable.invoiceNumber && (
                        <Typography variant="caption" color="text.secondary">
                          NF: {payable.invoiceNumber}
                        </Typography>
                      )}
                      {payable.tags.length > 0 && (
                        <Box
                          sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                        >
                          {payable.tags.map(({ tag }) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: tag.color || '#e0e0e0',
                                color: '#fff',
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{payable.vendor.name}</TableCell>
                  <TableCell
                    sx={{ display: { xs: 'none', tablet: 'table-cell' } }}
                  >
                    {payable.category && (
                      <Chip
                        label={payable.category.name}
                        size="small"
                        sx={{
                          backgroundColor: payable.category.color || '#e0e0e0',
                          color: '#fff',
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="medium">
                      {formatCurrency(payable.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {format(parseISO(payable.dueDate), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                      {getDueDateAlert(payable.dueDate, payable.status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={payable.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={
                        payable.paidAmount > 0
                          ? 'success.main'
                          : 'text.secondary'
                      }
                    >
                      {formatCurrency(payable.paidAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ display: { xs: 'none', tablet: 'table-cell' } }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                      }}
                    >
                      <Tooltip title="Registrar Pagamento">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            disabled={
                              payable.status === 'PAID' ||
                              payable.status === 'CANCELLED'
                            }
                            onClick={() => onPayment(payable)}
                          >
                            <PaymentIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onEdit(payable)}
                            disabled={payable.status === 'PAID'}
                          >
                            <EditIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onDelete(payable)}
                            disabled={payable.paidAmount > 0}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </MotionTableRow>
              ))}
            </AnimatePresence>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => {
          onRowsPerPageChange(Number.parseInt(e.target.value, 10));
        }}
        labelRowsPerPage="Linhas por página"
        labelDisplayedRows={({ from, to, count }) => {
          const total = count === -1 ? `mais de ${to}` : count;
          return `${from}-${to} de ${total}`;
        }}
      />
    </TableContainer>
  );
};
