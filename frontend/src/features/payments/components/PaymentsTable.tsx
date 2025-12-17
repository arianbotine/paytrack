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
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { TableSkeleton, EmptyState } from '../../../shared/components';
import { formatLocalDate } from '../../../shared/utils/dateUtils';
import type { Payment } from '../types';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import { getMethodLabel } from '../types';

interface PaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  onDelete: (payment: Payment) => void;
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
  const isPayable = !!allocation?.payable;

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
          {formatLocalDate(payment.paymentDate)}
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
                    const allocIsPayable = !!alloc.payable;
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
                              ? alloc.payable?.description
                              : alloc.receivable?.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {allocIsPayable
                              ? alloc.payable?.vendor.name
                              : alloc.receivable?.customer.name}
                          </Typography>
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
        <TableBody>{renderTableBody()}</TableBody>
      </Table>
    </TableContainer>
  );
};
