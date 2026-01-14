import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Tooltip,
  Typography,
  Collapse,
  Stack,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AccountBalance as PayableIcon,
  RequestQuote as ReceivableIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as ReferenceIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { TableSkeleton, EmptyState } from '../../../shared/components';
import {
  formatRelativeDatetime,
  formatLocalDatetime,
} from '../../../shared/utils/dateUtils';
import type { Payment } from '../types';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import { getMethodLabel } from '../types';

interface PaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  onDelete: (payment: Payment) => void;
  page: number;
  rowsPerPage: number;
  total: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const MotionTableRow = motion.create(TableRow);

const PaymentRow = React.forwardRef<
  HTMLTableRowElement,
  {
    payment: Payment;
    index: number;
    onDelete: (payment: Payment) => void;
  }
>(({ payment, index, onDelete }, ref) => {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleAllocations = payment.allocations.length > 1;
  const allocation = payment.allocations[0];
  const isPayable = !!allocation?.payableInstallment;

  return (
    <>
      <MotionTableRow
        ref={ref}
        hover
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
      >
        <TableCell>
          {hasMultipleAllocations && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
          <Tooltip title={formatLocalDatetime(payment.paymentDate)}>
            <span>{formatRelativeDatetime(payment.paymentDate)}</span>
          </Tooltip>
        </TableCell>
        <TableCell>
          {isPayable ? (
            <Chip
              icon={<PayableIcon />}
              label="Pagamento"
              color="error"
              size="small"
              variant="outlined"
            />
          ) : (
            <Chip
              icon={<ReceivableIcon />}
              label="Recebimento"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
          {hasMultipleAllocations && (
            <Chip
              label={`${payment.allocations.length} contas`}
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </TableCell>
        <TableCell>
          <Box>
            <Typography fontWeight="medium">
              {isPayable
                ? allocation?.payableInstallment?.payable?.vendor.name
                : allocation?.receivableInstallment?.receivable?.customer.name}
            </Typography>
            {/* Informação da parcela */}
            {(allocation?.payableInstallment ||
              allocation?.receivableInstallment) && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 0.5 }}
                alignItems="center"
              >
                <Chip
                  icon={<ReceiptIcon />}
                  label={
                    isPayable
                      ? `${allocation?.payableInstallment?.installmentNumber}/${allocation?.payableInstallment?.totalInstallments || 1}`
                      : `${allocation?.receivableInstallment?.installmentNumber}/${allocation?.receivableInstallment?.totalInstallments || 1}`
                  }
                  size="small"
                  variant="filled"
                  color="primary"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiChip-icon': {
                      color: 'primary.contrastText',
                      fontSize: 14,
                    },
                  }}
                />
              </Stack>
            )}
          </Box>
        </TableCell>
        <TableCell>{getMethodLabel(payment.method)}</TableCell>
        <TableCell align="right">
          <Typography
            fontWeight="medium"
            color={isPayable ? 'error.main' : 'success.main'}
          >
            {isPayable ? '-' : '+'} {formatCurrency(payment.amount)}
          </Typography>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            {payment.reference && (
              <Tooltip title={`Referência: ${payment.reference}`} arrow>
                <ReferenceIcon
                  sx={{
                    fontSize: 18,
                    color: 'primary.main',
                    cursor: 'help',
                  }}
                />
              </Tooltip>
            )}
            {payment.notes && (
              <Tooltip title={`Observações: ${payment.notes}`} arrow>
                <NotesIcon
                  sx={{
                    fontSize: 18,
                    color: 'text.secondary',
                    cursor: 'help',
                  }}
                />
              </Tooltip>
            )}
            {!payment.reference && !payment.notes && (
              <Typography variant="body2" color="text.secondary">
                -
              </Typography>
            )}
          </Stack>
        </TableCell>
        <TableCell align="right">
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(payment)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      </MotionTableRow>

      {hasMultipleAllocations && (
        <TableRow>
          <TableCell colSpan={7} sx={{ p: 0, borderBottom: expanded ? 1 : 0 }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Alocações do Pagamento:
                </Typography>
                <Stack spacing={1}>
                  {payment.allocations.map(alloc => {
                    const allocIsPayable = !!alloc.payableInstallment;
                    return (
                      <Box
                        key={alloc.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          p: 1.5,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {allocIsPayable
                              ? alloc.payableInstallment?.payable?.vendor.name
                              : alloc.receivableInstallment?.receivable
                                  ?.customer.name}
                          </Typography>
                          {/* Informação da parcela nas alocações */}
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Chip
                              icon={<ReceiptIcon />}
                              label={
                                allocIsPayable
                                  ? `${alloc.payableInstallment?.installmentNumber}/${alloc.payableInstallment?.totalInstallments || 1}`
                                  : `${alloc.receivableInstallment?.installmentNumber}/${alloc.receivableInstallment?.totalInstallments || 1}`
                              }
                              size="small"
                              variant="filled"
                              color="primary"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                '& .MuiChip-icon': {
                                  color: 'primary.contrastText',
                                  fontSize: 12,
                                },
                              }}
                            />
                          </Stack>
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={allocIsPayable ? 'error.main' : 'success.main'}
                        >
                          {formatCurrency(alloc.amount)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

PaymentRow.displayName = 'PaymentRow';

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  payments,
  isLoading,
  onDelete,
  page,
  rowsPerPage,
  total,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const renderTableBody = () => {
    if (isLoading) {
      return <TableSkeleton columns={7} rows={5} />;
    }

    if (payments.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <EmptyState
              variant="empty"
              title="Nenhum pagamento"
              description="Registre seu primeiro pagamento ou recebimento"
            />
          </TableCell>
        </TableRow>
      );
    }

    return (
      <AnimatePresence mode="popLayout">
        {payments.map((payment, index) => (
          <PaymentRow
            key={payment.id}
            payment={payment}
            index={index}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    );
  };

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Método</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Detalhes</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Itens por página:"
        labelDisplayedRows={({ from, to, count }) => {
          if (count === -1) {
            return `${from}-${to} de mais de ${to}`;
          }
          return `${from}-${to} de ${count}`;
        }}
      />
    </Paper>
  );
};
