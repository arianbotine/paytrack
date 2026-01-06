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
  History as HistoryIcon,
} from '@mui/icons-material';
import { differenceInDays, isAfter, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusChip } from './StatusChip';
import { TableSkeleton } from './TableSkeleton';
import { EmptyState } from './EmptyState';
import { formatLocalDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currencyUtils';
import type {
  PayableAccount,
  ReceivableAccount,
  AccountTableConfig,
} from '../types/account.types';

type AccountItem = PayableAccount | ReceivableAccount;

interface AccountsTableProps<T extends AccountItem> {
  readonly accounts: T[];
  readonly totalCount: number;
  readonly page: number;
  readonly rowsPerPage: number;
  readonly isLoading: boolean;
  readonly config: AccountTableConfig;
  readonly onPageChange: (page: number) => void;
  readonly onRowsPerPageChange: (rowsPerPage: number) => void;
  readonly onEdit: (account: T) => void;
  readonly onDelete: (account: T) => void;
  readonly onPayment: (account: T) => void;
  readonly onViewPayments?: (account: T) => void;
}

const getDueDateAlert = (dueDate: string, status: string) => {
  if (status === 'PAID' || status === 'CANCELLED') return null;

  // Normalizar para início do dia para comparar apenas a data, sem horário
  const today = startOfDay(new Date());
  // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
  const dueDateString = dueDate.split('T')[0];
  const due = startOfDay(new Date(dueDateString));
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

export function AccountsTable<T extends AccountItem>({
  accounts,
  totalCount,
  page,
  rowsPerPage,
  isLoading,
  config,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onPayment,
  onViewPayments,
}: AccountsTableProps<T>) {
  const getEntityName = (account: T): string => {
    if (config.type === 'payable') {
      return (account as PayableAccount).vendor.name;
    }
    return (account as ReceivableAccount).customer.name;
  };

  const getPaidAmount = (account: T): number => {
    if (config.type === 'payable') {
      return (account as PayableAccount).paidAmount;
    }
    return (account as ReceivableAccount).receivedAmount;
  };

  return (
    <TableContainer
      component={Paper}
      sx={{ borderRadius: 2, overflow: 'hidden' }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Descrição</TableCell>
            <TableCell>{config.entityFieldLabel}</TableCell>
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
              {config.amountFieldLabel}
            </TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && <TableSkeleton columns={8} rows={rowsPerPage} />}
          {!isLoading && accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={8}>
                <EmptyState
                  variant="empty"
                  title={config.emptyTitle}
                  description={config.emptyDescription}
                />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && accounts.length > 0 && (
            <AnimatePresence mode="popLayout">
              {accounts.map((account, index) => (
                <MotionTableRow
                  key={account.id}
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
                        {getEntityName(account)}
                      </Typography>
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
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor:
                                account.category.color || '#1976d2',
                              color: '#fff',
                            }}
                          />
                        )}
                        {account.tags.length > 0 &&
                          account.tags.map(({ tag }) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                borderColor: tag.color || '#e0e0e0',
                                color: tag.color || '#666',
                              }}
                            />
                          ))}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{ display: { xs: 'none', tablet: 'table-cell' } }}
                  >
                    {account.category && (
                      <Chip
                        label={account.category.name}
                        size="small"
                        sx={{
                          backgroundColor: account.category.color || '#e0e0e0',
                          color: '#fff',
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="medium">
                      {formatCurrency(account.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {formatLocalDate(account.dueDate)}
                      {getDueDateAlert(account.dueDate, account.status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={account.status} />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ display: { xs: 'none', tablet: 'table-cell' } }}
                  >
                    {getPaidAmount(account) > 0 ? (
                      <Box>
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight="medium"
                        >
                          {formatCurrency(getPaidAmount(account))}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
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
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onEdit(account)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {onViewPayments && getPaidAmount(account) > 0 && (
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
                      <Tooltip title="Registrar pagamento">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onPayment(account)}
                            disabled={
                              account.status === 'PAID' ||
                              account.status === 'CANCELLED'
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
                            disabled={getPaidAmount(account) > 0}
                          >
                            <DeleteIcon fontSize="small" />
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
        onRowsPerPageChange={e =>
          onRowsPerPageChange(Number.parseInt(e.target.value, 10))
        }
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count === -1 ? 'mais de ' + to : count}`
        }
      />
    </TableContainer>
  );
}
