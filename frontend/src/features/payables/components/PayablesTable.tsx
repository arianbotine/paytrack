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
  TablePagination,
  Collapse,
  LinearProgress,
  FormControlLabel,
  Switch,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
  Theme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusChip } from '../../../shared/components/StatusChip';
import { TableSkeleton } from '../../../shared/components/TableSkeleton';
import { EmptyState } from '../../../shared/components/EmptyState';
import { CurrencyField } from '../../../shared/components/CurrencyField';
import { formatLocalDate } from '../../../shared/utils/dateUtils';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import { computeInstallmentProgress } from '../../../shared/utils/installmentUtils';
import type { Payable, PayableInstallment } from '../types';

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
  onPayment: (item: Payable | PayableInstallment) => void;
  onViewPayments?: (payable: Payable) => void;
  onDeleteInstallment?: (
    payable: Payable,
    installment: PayableInstallment
  ) => void;
  onUpdateInstallment?: (
    payable: Payable,
    installment: PayableInstallment,
    newAmount: number
  ) => void;
}

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
  onViewPayments,
  onDeleteInstallment,
  onUpdateInstallment,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(true);
  const [editingInstallment, setEditingInstallment] = useState<string | null>(
    null
  );
  const [editAmount, setEditAmount] = useState<number | null>(null);

  // Filtrar contas e aplicar filtro de concluídas
  const filteredAccounts = payables.filter(p => {
    if (hideCompleted && p.status === 'PAID') return false;
    return true;
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const hasInstallments = (payable: Payable) => {
    return payable.installments && payable.installments.length > 0;
  };

  const handleStartEdit = (installment: PayableInstallment) => {
    setEditingInstallment(installment.id);
    setEditAmount(null);
  };

  const handleCancelEdit = () => {
    setEditingInstallment(null);
    setEditAmount(null);
  };

  const handleSaveEdit = (
    payable: Payable,
    installment: PayableInstallment
  ) => {
    if (editAmount && editAmount > 0 && onUpdateInstallment) {
      onUpdateInstallment(payable, installment, editAmount);
      handleCancelEdit();
    }
  };

  // Helper function to determine text color based on installment number
  const getInstallmentTextColor = (
    installmentNumber: number,
    totalInstallments: number
  ) => {
    if (installmentNumber === 1) return 'primary.main';
    if (installmentNumber === totalInstallments) return 'success.main';
    return 'text.primary';
  };

  // Helper function to determine border color based on index
  const getBorderColor = (index: number, totalLength: number) => {
    if (index === 0) return 'primary.main';
    if (index === totalLength - 1) return 'success.main';
    return 'divider';
  };

  // Helper function to determine hover border color based on index
  const getHoverBorderColor = (index: number, totalLength: number) => {
    if (index === 0) return 'primary.dark';
    if (index === totalLength - 1) return 'success.dark';
    return 'primary.light';
  };

  // Helper function to determine background color based on index
  const getBackgroundColor =
    (idx: number, totalLength: number) => (theme: Theme) => {
      if (idx === 0) return theme.palette.primary.main + '08';
      if (idx === totalLength - 1) return theme.palette.success.main + '08';
      return 'background.paper';
    };

  const renderMobileContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {new Array(3).fill(null).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Typography variant="h6">Carregando...</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      );
    }
    if (filteredAccounts.length === 0) {
      return (
        <Paper sx={{ p: 4 }}>
          <EmptyState
            variant="empty"
            title="Nenhuma conta a pagar"
            description="Crie sua primeira conta a pagar para começar"
          />
        </Paper>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <AnimatePresence mode="popLayout">
          {filteredAccounts.map((account, index) => {
            const installments = account.installments || [];
            const progress = hasInstallments(account)
              ? computeInstallmentProgress(installments)
              : null;

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                <Card>
                  <CardHeader
                    title={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {account.vendor.name}
                        </Typography>
                        {account.invoiceNumber && (
                          <Typography variant="caption" color="text.secondary">
                            NF: {account.invoiceNumber}
                          </Typography>
                        )}
                      </Box>
                    }
                    subheader={
                      <Box sx={{ mt: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          {account.category && (
                            <Chip
                              label={account.category.name}
                              size="small"
                              sx={{
                                bgcolor: account.category.color,
                                color: 'white',
                                fontWeight: 500,
                              }}
                            />
                          )}
                          {account.tags.map(({ tag }) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: tag.color,
                                color: tag.color,
                              }}
                            />
                          ))}
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Vencimento:{' '}
                          {account.nextUnpaidDueDate
                            ? formatLocalDate(account.nextUnpaidDueDate)
                            : '-'}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            mt: 1,
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="h6" color="primary">
                            {formatCurrency(account.amount)}
                          </Typography>
                          <StatusChip status={account.status} />
                        </Box>
                        {hasInstallments(account) && progress && (
                          <Box sx={{ mt: 2 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                parcelas pagas
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {progress.percentage}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={progress.percentage}
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  {account.tags.length > 0 && (
                    <CardContent sx={{ pt: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        {account.tags.map(({ tag }) => (
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
                    </CardContent>
                  )}
                  <CardActions sx={{ justifyContent: 'flex-end', gap: 0.5 }}>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onEdit(account)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {onViewPayments && account.paidAmount > 0 && (
                      <Tooltip title="Ver pagamentos">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => onViewPayments(account)}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip
                      title={
                        account.installments?.length > 1
                          ? 'Registrar pagamento diretamente nas parcelas'
                          : 'Registrar pagamento'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => onPayment(account)}
                          disabled={
                            account.status === 'PAID' ||
                            account.installments?.length > 1
                          }
                        >
                          <PaymentIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(account)}
                          disabled={account.paidAmount > 0}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </CardActions>

                  {/* Accordion de Parcelas */}
                  {hasInstallments(account) && (
                    <Accordion disableGutters elevation={0}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" fontWeight="medium">
                          Ver Parcelas ({installments.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {installments.map((installment, idx) => (
                          <Box
                            key={installment.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 1,
                              px: 2,
                              mb: 1,
                              borderRadius: 1,
                              border: 1,
                              borderColor: getBorderColor(
                                idx,
                                installments.length
                              ),
                              backgroundColor: getBackgroundColor(
                                idx,
                                installments.length
                              ),
                              '&:hover': {
                                borderColor: getHoverBorderColor(
                                  idx,
                                  installments.length
                                ),
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography
                                variant="body2"
                                fontWeight="medium"
                                color={getInstallmentTextColor(
                                  installment.installmentNumber,
                                  installments.length
                                )}
                              >
                                {installment.installmentNumber}ª parcela
                              </Typography>
                              <Chip
                                label={formatLocalDate(installment.dueDate)}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2" fontWeight="medium">
                                {editingInstallment === installment.id ? (
                                  <CurrencyField
                                    size="small"
                                    value={editAmount}
                                    onChange={setEditAmount}
                                    sx={{
                                      width: '140px',
                                      display: 'inline-flex',
                                      verticalAlign: 'middle',
                                      '& input': {
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                      },
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  formatCurrency(installment.amount)
                                )}
                              </Typography>
                              <StatusChip status={installment.status} />
                              {editingInstallment === installment.id ? (
                                <>
                                  <Tooltip title="Salvar">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() =>
                                        handleSaveEdit(account, installment)
                                      }
                                    >
                                      <CheckIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancelar">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={handleCancelEdit}
                                    >
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  {onUpdateInstallment &&
                                    installment.status === 'PENDING' && (
                                      <Tooltip title="Editar valor">
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() =>
                                            handleStartEdit(installment)
                                          }
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  <Tooltip title="Registrar pagamento">
                                    <span>
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => onPayment(installment)}
                                        disabled={installment.status === 'PAID'}
                                      >
                                        <PaymentIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  {onDeleteInstallment &&
                                    installment.status === 'PENDING' &&
                                    installments.length > 1 && (
                                      <Tooltip title="Excluir parcela">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            onDeleteInstallment(
                                              account,
                                              installment
                                            )
                                          }
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                </>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControlLabel
          control={
            <Switch
              checked={hideCompleted}
              onChange={e => setHideCompleted(e.target.checked)}
            />
          }
          label="Ocultar concluídas"
        />
      </Box>

      {/* Mobile View - Cards com Accordion */}
      {isMobile ? (
        <Box>{renderMobileContent()}</Box>
      ) : (
        /* Desktop View - Table com Collapse */
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, overflow: 'hidden' }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={48} />
                <TableCell>Fornecedor & Identificação</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableSkeleton columns={6} rows={rowsPerPage} />}
              {!isLoading && filteredAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      variant="empty"
                      title="Nenhuma conta a pagar"
                      description="Crie sua primeira conta a pagar para começar"
                    />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredAccounts.length > 0 && (
                <AnimatePresence mode="popLayout">
                  {filteredAccounts.map((account, index) => {
                    const isExpanded = expandedRows.has(account.id);
                    const installments = account.installments || [];
                    const progress = hasInstallments(account)
                      ? computeInstallmentProgress(installments)
                      : null;

                    return (
                      <React.Fragment key={account.id}>
                        <MotionTableRow
                          hover
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.03, duration: 0.2 }}
                        >
                          <TableCell>
                            {hasInstallments(account) && (
                              <IconButton
                                size="small"
                                onClick={() => toggleRow(account.id)}
                              >
                                {isExpanded ? (
                                  <ExpandLessIcon />
                                ) : (
                                  <ExpandMoreIcon />
                                )}
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                              }}
                            >
                              {/* Nome do fornecedor como título principal */}
                              <Typography fontWeight="600" fontSize="0.9rem">
                                {account.vendor.name}
                              </Typography>

                              {/* Categoria e Tags em uma única linha */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 0.5,
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                }}
                              >
                                {account.category && (
                                  <Chip
                                    label={account.category.name}
                                    size="small"
                                    sx={{
                                      bgcolor:
                                        account.category.color || '#6B7280',
                                      color: 'white',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: 22,
                                    }}
                                  />
                                )}
                                {account.tags.map(({ tag }) => (
                                  <Chip
                                    key={tag.id}
                                    label={tag.name}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: tag.color || '#3B82F6',
                                      color: tag.color || '#3B82F6',
                                      fontSize: '0.7rem',
                                      height: 22,
                                      fontWeight: 500,
                                    }}
                                  />
                                ))}
                                {account.invoiceNumber && (
                                  <Chip
                                    label={`NF: ${account.invoiceNumber}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: '#9CA3AF',
                                      color: '#6B7280',
                                      fontSize: '0.7rem',
                                      height: 22,
                                    }}
                                  />
                                )}
                              </Box>

                              {/* Progresso de parcelas se houver */}
                              {hasInstallments(account) && progress && (
                                <Box sx={{ mt: 0.5, maxWidth: 300 }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      mb: 0.5,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontWeight={500}
                                    >
                                      {progress.paidCount}/{progress.totalCount}{' '}
                                      parcelas
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontWeight={600}
                                    >
                                      {progress.percentage}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={progress.percentage}
                                    sx={{
                                      height: 6,
                                      borderRadius: 1,
                                      bgcolor: 'grey.200',
                                      '& .MuiLinearProgress-bar': {
                                        borderRadius: 1,
                                      },
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="medium">
                              {formatCurrency(account.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {account.nextUnpaidDueDate
                              ? formatLocalDate(account.nextUnpaidDueDate)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <StatusChip status={account.status} />
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 0.5,
                                justifyContent: 'flex-end',
                              }}
                            >
                              <Tooltip title="Editar">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => onEdit(account)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {onViewPayments && account.paidAmount > 0 && (
                                <Tooltip title="Ver pagamentos">
                                  <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => onViewPayments(account)}
                                  >
                                    <HistoryIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip
                                title={
                                  account.installments?.length > 1
                                    ? 'Registrar pagamento diretamente nas parcelas'
                                    : 'Registrar pagamento'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      if (account.installments?.length === 1) {
                                        onPayment(account.installments[0]);
                                      } else {
                                        onPayment(account);
                                      }
                                    }}
                                    disabled={
                                      account.status === 'PAID' ||
                                      account.status === 'CANCELLED' ||
                                      account.installments?.length > 1
                                    }
                                  >
                                    <PaymentIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Excluir">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => onDelete(account)}
                                    disabled={account.paidAmount > 0}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </MotionTableRow>

                        {/* Linha expansível com parcelas */}
                        {hasInstallments(account) && (
                          <TableRow>
                            <TableCell
                              style={{ paddingBottom: 0, paddingTop: 0 }}
                              colSpan={8}
                            >
                              <Collapse
                                in={isExpanded}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box sx={{ margin: 2 }}>
                                  <Typography
                                    variant="subtitle2"
                                    gutterBottom
                                    component="div"
                                  >
                                    Parcelas
                                  </Typography>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Parcela</TableCell>
                                        <TableCell>Vencimento</TableCell>
                                        <TableCell align="right">
                                          Valor
                                        </TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">
                                          Pago
                                        </TableCell>
                                        <TableCell align="right">
                                          Ações
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {installments.map(installment => (
                                        <TableRow key={installment.id}>
                                          <TableCell>
                                            <Box
                                              sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                              }}
                                            >
                                              <Typography
                                                variant="body2"
                                                fontWeight="bold"
                                                color={getInstallmentTextColor(
                                                  installment.installmentNumber,
                                                  installments.length
                                                )}
                                              >
                                                {installment.installmentNumber ===
                                                  1 && '🏁'}
                                                {installment.installmentNumber ===
                                                  installments.length && '🎯'}
                                                {installment.installmentNumber}/
                                                {installments.length}
                                              </Typography>
                                              {installment.installmentNumber ===
                                                1 && (
                                                <Chip
                                                  label="1ª"
                                                  size="small"
                                                  color="primary"
                                                  variant="outlined"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    height: '16px',
                                                    minWidth: '24px',
                                                  }}
                                                />
                                              )}
                                              {installment.installmentNumber ===
                                                installments.length && (
                                                <Chip
                                                  label="Última"
                                                  size="small"
                                                  color="success"
                                                  variant="outlined"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    height: '16px',
                                                  }}
                                                />
                                              )}
                                            </Box>
                                          </TableCell>
                                          <TableCell>
                                            {formatLocalDate(
                                              installment.dueDate
                                            )}
                                          </TableCell>
                                          <TableCell align="right">
                                            {editingInstallment ===
                                            installment.id ? (
                                              <CurrencyField
                                                size="small"
                                                value={editAmount}
                                                onChange={setEditAmount}
                                                sx={{
                                                  width: '140px',
                                                  '& input': {
                                                    textAlign: 'right',
                                                  },
                                                }}
                                                autoFocus
                                              />
                                            ) : (
                                              formatCurrency(installment.amount)
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <StatusChip
                                              status={installment.status}
                                            />
                                          </TableCell>
                                          <TableCell align="right">
                                            {installment.paidAmount > 0 ? (
                                              <Typography
                                                variant="body2"
                                                color="success.main"
                                                fontWeight="medium"
                                              >
                                                {formatCurrency(
                                                  installment.paidAmount
                                                )}
                                              </Typography>
                                            ) : (
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                              >
                                                —
                                              </Typography>
                                            )}
                                          </TableCell>
                                          <TableCell align="right">
                                            <Box
                                              sx={{
                                                display: 'flex',
                                                gap: 0.5,
                                                justifyContent: 'flex-end',
                                              }}
                                            >
                                              {onViewPayments &&
                                                installment.paidAmount > 0 && (
                                                  <Tooltip title="Ver pagamentos">
                                                    <IconButton
                                                      size="small"
                                                      color="info"
                                                      onClick={() =>
                                                        onViewPayments(account)
                                                      }
                                                    >
                                                      <HistoryIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                )}
                                              {editingInstallment ===
                                              installment.id ? (
                                                <>
                                                  <Tooltip title="Salvar">
                                                    <IconButton
                                                      size="small"
                                                      color="success"
                                                      onClick={() =>
                                                        handleSaveEdit(
                                                          account,
                                                          installment
                                                        )
                                                      }
                                                    >
                                                      <CheckIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                  <Tooltip title="Cancelar">
                                                    <IconButton
                                                      size="small"
                                                      color="error"
                                                      onClick={handleCancelEdit}
                                                    >
                                                      <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                </>
                                              ) : (
                                                <>
                                                  {onUpdateInstallment &&
                                                    installment.status ===
                                                      'PENDING' && (
                                                      <Tooltip title="Editar valor">
                                                        <IconButton
                                                          size="small"
                                                          color="primary"
                                                          onClick={() =>
                                                            handleStartEdit(
                                                              installment
                                                            )
                                                          }
                                                        >
                                                          <EditIcon fontSize="small" />
                                                        </IconButton>
                                                      </Tooltip>
                                                    )}
                                                  <Tooltip title="Registrar pagamento">
                                                    <span>
                                                      <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() =>
                                                          onPayment(installment)
                                                        }
                                                        disabled={
                                                          installment.status ===
                                                            'PAID' ||
                                                          installment.status ===
                                                            'CANCELLED'
                                                        }
                                                      >
                                                        <PaymentIcon fontSize="small" />
                                                      </IconButton>
                                                    </span>
                                                  </Tooltip>
                                                </>
                                              )}
                                              {onDeleteInstallment &&
                                                installment.status ===
                                                  'PENDING' &&
                                                installments.length > 1 && (
                                                  <Tooltip title="Excluir parcela">
                                                    <IconButton
                                                      size="small"
                                                      color="error"
                                                      onClick={() =>
                                                        onDeleteInstallment(
                                                          account,
                                                          installment
                                                        )
                                                      }
                                                    >
                                                      <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                )}
                                            </Box>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Paginação compartilhada */}
      {!isLoading && filteredAccounts.length > 0 && (
        <Paper sx={{ mt: isMobile ? 2 : 0, borderRadius: isMobile ? 2 : 0 }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => onPageChange(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e =>
              onRowsPerPageChange(Number.parseInt(e.target.value, 10))
            }
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count === -1 ? 'mais de ' + to : count}`
            }
          />
        </Paper>
      )}
    </Box>
  );
};
