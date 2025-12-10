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
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AccountBalance as PayableIcon,
  RequestQuote as ReceivableIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { TableSkeleton, EmptyState } from '../../../shared/components';
import type { Payment } from '../types';
import { formatCurrency, getMethodLabel } from '../types';

interface PaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  onDelete: (payment: Payment) => void;
}

const MotionTableRow = motion.create(TableRow);

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  payments,
  isLoading,
  onDelete,
}) => {
  return (
    <TableContainer
      component={Paper}
      sx={{ borderRadius: 2, overflow: 'hidden' }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Descrição</TableCell>
            <TableCell>Método</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell>Referência</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <EmptyState
                  variant="empty"
                  title="Nenhum pagamento"
                  description="Registre seu primeiro pagamento ou recebimento"
                />
              </TableCell>
            </TableRow>
          ) : (
            <AnimatePresence mode="popLayout">
              {payments.map((payment, index) => {
                const allocation = payment.allocations?.[0];
                const isPayable = !!allocation?.payable;

                return (
                  <MotionTableRow
                    key={payment.id}
                    hover
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <TableCell>
                      {format(parseISO(payment.paymentDate), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
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
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography fontWeight="medium">
                          {isPayable
                            ? allocation?.payable?.description
                            : allocation?.receivable?.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isPayable
                            ? allocation?.payable?.vendor.name
                            : allocation?.receivable?.customer.name}
                        </Typography>
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
                      <Typography variant="body2" color="text.secondary">
                        {payment.reference || '-'}
                      </Typography>
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
                );
              })}
            </AnimatePresence>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
