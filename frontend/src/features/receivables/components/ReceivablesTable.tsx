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
  Divider,
  useMediaQuery,
  useTheme,
  TextField,
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
  Info as InfoIcon,
  LocalOffer as LocalOfferIcon,
  Comment as CommentIcon,
  EditNote as EditNoteIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusChip } from '../../../shared/components/StatusChip';
import { TableSkeleton } from '../../../shared/components/TableSkeleton';
import { EmptyState } from '../../../shared/components/EmptyState';
import { CurrencyField } from '../../../shared/components/CurrencyField';
import { formatLocalDate } from '../../../shared/utils/dateUtils';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import { computeInstallmentProgress } from '../../../shared/utils/installmentUtils';
import type { Receivable, ReceivableInstallment } from '../types';

interface ReceivablesTableProps {
  receivables: Receivable[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  isLoading: boolean;
  hideCompleted: boolean;
  onHideCompletedChange: (hide: boolean) => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (receivable: Receivable) => void;
  onDelete: (receivable: Receivable) => void;
  onPayment: (item: Receivable | ReceivableInstallment) => void;
  onViewPayments?: (receivable: Receivable) => void;
  onDeleteInstallment?: (
    receivable: Receivable,
    installment: ReceivableInstallment
  ) => void;
  onUpdateInstallment?: (
    receivable: Receivable,
    installment: ReceivableInstallment,
    newAmount: number
  ) => void;
  onUpdateInstallmentDueDate?: (
    receivable: Receivable,
    installment: ReceivableInstallment,
    newDueDate: string
  ) => void;
  onEditInstallment?: (
    receivable: Receivable,
    installment: ReceivableInstallment
  ) => void;
}

const MotionTableRow = motion.create(TableRow);

export const ReceivablesTable: React.FC<ReceivablesTableProps> = ({
  receivables,
  totalCount,
  page,
  rowsPerPage,
  isLoading,
  hideCompleted,
  onHideCompletedChange,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onPayment,
  onViewPayments,
  onDeleteInstallment,
  onUpdateInstallment,
  onUpdateInstallmentDueDate,
  onEditInstallment,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingInstallment, setEditingInstallment] = useState<string | null>(
    null
  );
  const [editAmount, setEditAmount] = useState<number | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState<string>('');

  const filteredAccounts = receivables;

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

  const hasInstallments = (receivable: Receivable) => {
    return receivable.installments && receivable.installments.length > 0;
  };

  const handleStartEdit = (installment: ReceivableInstallment) => {
    setEditingInstallment(installment.id);
    setEditAmount(null);
  };

  const handleCancelEdit = () => {
    setEditingInstallment(null);
    setEditAmount(null);
    setEditingDueDate(null);
    setEditDueDate('');
  };

  const handleSaveEdit = (
    receivable: Receivable,
    installment: ReceivableInstallment
  ) => {
    if (editAmount && editAmount > 0 && onUpdateInstallment) {
      onUpdateInstallment(receivable, installment, editAmount);
      handleCancelEdit();
    }
  };

  const handleStartEditDueDate = (installment: ReceivableInstallment) => {
    setEditingDueDate(installment.id);
    setEditDueDate(installment.dueDate);
  };

  const handleSaveEditDueDate = (
    receivable: Receivable,
    installment: ReceivableInstallment
  ) => {
    if (
      editDueDate &&
      editDueDate.trim() !== '' &&
      editDueDate !== installment.dueDate &&
      onUpdateInstallmentDueDate
    ) {
      onUpdateInstallmentDueDate(receivable, installment, editDueDate);
      handleCancelEdit();
    } else {
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

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControlLabel
          control={
            <Switch
              checked={hideCompleted}
              onChange={e => onHideCompletedChange(e.target.checked)}
            />
          }
          label="Ocultar concluídas"
        />
      </Box>

      {/* Mobile View - Cards com Accordion */}
      {isMobile && (
        <Box>
          {(() => {
            if (isLoading) {
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {new Array(3).fill(null).map((_, i) => (
                    <Card key={`loading-card-${i}`}>
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
                    title="Nenhuma conta a receber"
                    description="Crie sua primeira conta a receber para começar"
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
                                <Typography
                                  variant="subtitle1"
                                  fontWeight="medium"
                                >
                                  {account.customer.name}
                                </Typography>
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
                                  {account.nextUnpaidAmount !== null &&
                                  account.nextUnpaidAmount !==
                                    account.amount ? (
                                    <Tooltip
                                      title={
                                        <Box>
                                          <Typography
                                            variant="caption"
                                            display="block"
                                          >
                                            Valor Total:{' '}
                                            {formatCurrency(account.amount)}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            display="block"
                                          >
                                            Próxima Parcela:{' '}
                                            {formatCurrency(
                                              account.nextUnpaidAmount
                                            )}
                                          </Typography>
                                        </Box>
                                      }
                                      arrow
                                    >
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                        }}
                                      >
                                        <Typography
                                          variant="h6"
                                          color="primary"
                                        >
                                          {formatCurrency(
                                            account.nextUnpaidAmount
                                          )}
                                        </Typography>
                                        <InfoIcon
                                          fontSize="small"
                                          sx={{
                                            color: 'text.secondary',
                                            opacity: 0.7,
                                          }}
                                        />
                                      </Box>
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="h6" color="primary">
                                      {formatCurrency(account.amount)}
                                    </Typography>
                                  )}
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
                                        parcelas recebidas
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
                          <CardActions
                            sx={{ justifyContent: 'flex-end', gap: 0.5 }}
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
                            {onViewPayments && account.receivedAmount > 0 && (
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
                            {!hasInstallments(account) ||
                            account.installments?.length === 1 ? (
                              <Tooltip title="Registrar recebimento">
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
                                      account.status === 'CANCELLED'
                                    }
                                  >
                                    <PaymentIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : null}
                            <Tooltip title="Excluir">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => onDelete(account)}
                                  disabled={account.receivedAmount > 0}
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
                                  <Box key={installment.id}>
                                    {idx > 0 && <Divider sx={{ my: 1 }} />}
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                      }}
                                    >
                                      <Box sx={{ flex: 1 }}>
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            mb: 0.5,
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
                                              1 && '🏁 '}
                                            {installment.installmentNumber ===
                                              installments.length && '🎯 '}
                                            Parcela{' '}
                                            {installment.installmentNumber}/
                                            {installments.length}
                                          </Typography>
                                          {installment.installmentNumber ===
                                            1 && (
                                            <Chip
                                              label="Primeira"
                                              size="small"
                                              color="primary"
                                              variant="outlined"
                                              sx={{
                                                fontSize: '0.7rem',
                                                height: '18px',
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
                                                fontSize: '0.7rem',
                                                height: '18px',
                                              }}
                                            />
                                          )}
                                        </Box>
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            mt: 0.5,
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            {formatLocalDate(
                                              installment.dueDate
                                            )}
                                          </Typography>
                                          {installment.isOverdue &&
                                            installment.status !== 'PAID' && (
                                              <Chip
                                                label="Vencido"
                                                size="small"
                                                color="error"
                                                sx={{
                                                  height: 16,
                                                  fontSize: '0.6rem',
                                                  fontWeight: 600,
                                                  animation:
                                                    'pulse 2s ease-in-out infinite',
                                                  '@keyframes pulse': {
                                                    '0%, 100%': { opacity: 1 },
                                                    '50%': { opacity: 0.7 },
                                                  },
                                                }}
                                              />
                                            )}
                                        </Box>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {editingInstallment ===
                                          installment.id ? (
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
                                        <Box sx={{ mt: 0.5 }}>
                                          <StatusChip
                                            status={installment.status}
                                          />
                                        </Box>
                                      </Box>
                                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {onViewPayments &&
                                          installment.receivedAmount > 0 && (
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
                                            <Tooltip title="Registrar recebimento">
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
                                          </>
                                        )}
                                      </Box>
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
          })()}
        </Box>
      )}
      {/* Desktop View - Table com Collapse */}
      {!isMobile && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, overflow: 'hidden' }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={48} />
                <TableCell>Devedor & Identificação</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Próximo vencimento</TableCell>
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
                      title="Nenhuma conta a receber"
                      description="Crie sua primeira conta a receber para começar"
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
                              {/* Nome do devedor como título principal */}
                              <Typography fontWeight="600" fontSize="0.9rem">
                                {account.customer.name}
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
                            {account.nextUnpaidAmount !== null &&
                            account.nextUnpaidAmount !== account.amount ? (
                              <Tooltip
                                title={
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Valor Total:{' '}
                                      {formatCurrency(account.amount)}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Próxima Parcela:{' '}
                                      {formatCurrency(account.nextUnpaidAmount)}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 0.5,
                                  }}
                                >
                                  <Typography fontWeight="medium">
                                    {formatCurrency(account.nextUnpaidAmount)}
                                  </Typography>
                                  <InfoIcon
                                    fontSize="small"
                                    sx={{
                                      color: 'text.secondary',
                                      opacity: 0.7,
                                    }}
                                  />
                                </Box>
                              </Tooltip>
                            ) : (
                              <Typography fontWeight="medium">
                                {formatCurrency(account.amount)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              {account.nextUnpaidDueDate ? (
                                <>
                                  <Typography variant="body2">
                                    {formatLocalDate(account.nextUnpaidDueDate)}
                                  </Typography>
                                  {account.installments?.some(
                                    inst =>
                                      inst.isOverdue && inst.status !== 'PAID'
                                  ) && (
                                    <Chip
                                      label="Vencido"
                                      size="small"
                                      color="error"
                                      sx={{
                                        height: 20,
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        animation:
                                          'pulse 2s ease-in-out infinite',
                                        '@keyframes pulse': {
                                          '0%, 100%': { opacity: 1 },
                                          '50%': { opacity: 0.7 },
                                        },
                                      }}
                                    />
                                  )}
                                </>
                              ) : (
                                '-'
                              )}
                            </Box>
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
                              {onViewPayments && account.receivedAmount > 0 && (
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
                                    ? 'Registrar recebimento diretamente nas parcelas'
                                    : 'Registrar recebimento'
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
                                    disabled={account.receivedAmount > 0}
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
                                        <TableCell align="right">
                                          Valor
                                        </TableCell>
                                        <TableCell>Vencimento</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">
                                          Recebido
                                        </TableCell>
                                        <TableCell>Tags</TableCell>
                                        <TableCell>Obs.</TableCell>
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
                                          <TableCell align="right">
                                            <Box
                                              sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                gap: 0.5,
                                              }}
                                            >
                                              {editingInstallment ===
                                              installment.id ? (
                                                <>
                                                  <CurrencyField
                                                    size="small"
                                                    value={editAmount}
                                                    onChange={setEditAmount}
                                                    sx={{
                                                      width: '140px',
                                                      '& input': {
                                                        textAlign: 'right',
                                                        fontSize: '0.875rem',
                                                        padding: '4px 8px',
                                                      },
                                                    }}
                                                    autoFocus
                                                  />
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
                                                  <Typography variant="body2">
                                                    {formatCurrency(
                                                      installment.amount
                                                    )}
                                                  </Typography>
                                                  {onUpdateInstallment &&
                                                    installment.status ===
                                                      'PENDING' && (
                                                      <Tooltip title="Editar valor">
                                                        <IconButton
                                                          size="small"
                                                          onClick={() =>
                                                            handleStartEdit(
                                                              installment
                                                            )
                                                          }
                                                          sx={{
                                                            ml: 0.5,
                                                            padding: 0.5,
                                                          }}
                                                        >
                                                          <EditIcon
                                                            sx={{
                                                              fontSize: 16,
                                                            }}
                                                          />
                                                        </IconButton>
                                                      </Tooltip>
                                                    )}
                                                </>
                                              )}
                                            </Box>
                                          </TableCell>
                                          <TableCell>
                                            <Box
                                              sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                              }}
                                            >
                                              {editingDueDate ===
                                              installment.id ? (
                                                <Box
                                                  sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                  }}
                                                >
                                                  <TextField
                                                    type="date"
                                                    size="small"
                                                    value={editDueDate}
                                                    onChange={e =>
                                                      setEditDueDate(
                                                        e.target.value
                                                      )
                                                    }
                                                    sx={{
                                                      width: '140px',
                                                      '& input': {
                                                        fontSize: '0.875rem',
                                                        padding: '4px 8px',
                                                      },
                                                    }}
                                                    autoFocus
                                                    InputLabelProps={{
                                                      shrink: true,
                                                    }}
                                                  />
                                                  <Tooltip title="Salvar">
                                                    <IconButton
                                                      size="small"
                                                      color="success"
                                                      onClick={() =>
                                                        handleSaveEditDueDate(
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
                                                </Box>
                                              ) : (
                                                <>
                                                  <Typography variant="body2">
                                                    {formatLocalDate(
                                                      installment.dueDate
                                                    )}
                                                  </Typography>
                                                  {installment.isOverdue &&
                                                    installment.status !==
                                                      'PAID' && (
                                                      <Chip
                                                        label="Vencido"
                                                        size="small"
                                                        color="error"
                                                        sx={{
                                                          height: 18,
                                                          fontSize: '0.65rem',
                                                          fontWeight: 600,
                                                          animation:
                                                            'pulse 2s ease-in-out infinite',
                                                          '@keyframes pulse': {
                                                            '0%, 100%': {
                                                              opacity: 1,
                                                            },
                                                            '50%': {
                                                              opacity: 0.7,
                                                            },
                                                          },
                                                        }}
                                                      />
                                                    )}
                                                  {onUpdateInstallmentDueDate &&
                                                    installment.status ===
                                                      'PENDING' && (
                                                      <Tooltip title="Editar data">
                                                        <IconButton
                                                          size="small"
                                                          onClick={() =>
                                                            handleStartEditDueDate(
                                                              installment
                                                            )
                                                          }
                                                          sx={{
                                                            ml: 0.5,
                                                            padding: 0.5,
                                                          }}
                                                        >
                                                          <EditIcon
                                                            sx={{
                                                              fontSize: 16,
                                                            }}
                                                          />
                                                        </IconButton>
                                                      </Tooltip>
                                                    )}
                                                </>
                                              )}
                                            </Box>
                                          </TableCell>
                                          <TableCell>
                                            <StatusChip
                                              status={installment.status}
                                            />
                                          </TableCell>
                                          <TableCell align="right">
                                            {installment.receivedAmount > 0 ? (
                                              <Typography
                                                variant="body2"
                                                color="success.main"
                                                fontWeight="medium"
                                              >
                                                {formatCurrency(
                                                  installment.receivedAmount
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
                                          <TableCell>
                                            {installment.tags &&
                                            installment.tags.length > 0 ? (
                                              <Tooltip
                                                title={
                                                  <Box>
                                                    {installment.tags
                                                      .slice(0, 10)
                                                      .map(t => (
                                                        <Box key={t.tag.id}>
                                                          {t.tag.name}
                                                        </Box>
                                                      ))}
                                                    {installment.tags.length >
                                                      10 && (
                                                      <Box
                                                        sx={{
                                                          fontStyle: 'italic',
                                                          mt: 0.5,
                                                        }}
                                                      >
                                                        +
                                                        {installment.tags
                                                          .length - 10}{' '}
                                                        mais...
                                                      </Box>
                                                    )}
                                                  </Box>
                                                }
                                              >
                                                <Chip
                                                  icon={<LocalOfferIcon />}
                                                  label={`+${installment.tags.length}`}
                                                  size="small"
                                                  color="secondary"
                                                />
                                              </Tooltip>
                                            ) : (
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                              >
                                                —
                                              </Typography>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {installment.notes ? (
                                              <Tooltip
                                                title={installment.notes}
                                              >
                                                <CommentIcon
                                                  fontSize="small"
                                                  color="action"
                                                />
                                              </Tooltip>
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
                                              {onEditInstallment && (
                                                <Tooltip title="Editar parcela">
                                                  <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                      onEditInstallment(
                                                        account,
                                                        installment
                                                      )
                                                    }
                                                  >
                                                    <EditNoteIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              )}
                                              {onViewPayments &&
                                                installment.receivedAmount >
                                                  0 && (
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
                                              <Tooltip title="Registrar recebimento">
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
