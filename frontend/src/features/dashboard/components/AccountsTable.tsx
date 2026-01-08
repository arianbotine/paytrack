import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Box,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatLocalDate } from '../../../shared/utils/dateUtils';
import { formatCurrency } from '../../../shared/utils/currencyUtils';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Account {
  id: string;
  amount: number;
  paidAmount?: number;
  receivedAmount?: number;
  nextUnpaidDueDate: string | null;
  nextUnpaidAmount?: number | string | null;
  vendor?: { name: string };
  customer?: { name: string };
  category?: Category;
  tags: { tag: Tag }[];
}

interface AccountsTableProps {
  title: string;
  accounts: Account[];
  type: 'payable' | 'receivable';
  emptyMessage: string;
  alertColor: 'error' | 'warning';
}

export const AccountsTable: React.FC<AccountsTableProps> = ({
  title,
  accounts,
  type,
  emptyMessage,
  alertColor,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
            }}
          >
            {alertColor === 'error' ? (
              <WarningIcon color="error" />
            ) : (
              <ScheduleIcon color="warning" />
            )}
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            {accounts.length > 0 && (
              <Chip
                label={accounts.length}
                size="small"
                color={alertColor}
                sx={{ ml: 'auto' }}
              />
            )}
          </Box>

          {accounts.length === 0 ? (
            <Alert
              severity="success"
              sx={{
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  alignItems: 'center',
                },
              }}
            >
              {emptyMessage}
            </Alert>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Conta</TableCell>
                    <TableCell align="right">Vencimento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.slice(0, 5).map((account, index) => (
                    <motion.tr
                      key={account.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{ display: 'table-row' }}
                    >
                      <TableCell>
                        {(() => {
                          const name =
                            account.vendor?.name || account.customer?.name;

                          const tagsCount = account.tags.length;
                          let tagsText: string | null = null;
                          if (tagsCount === 1) {
                            tagsText = account.tags[0].tag.name;
                          } else if (tagsCount > 1) {
                            tagsText = `+${tagsCount} tags`;
                          }

                          let tagsTooltip = '';
                          if (tagsCount > 0) {
                            tagsTooltip = account.tags
                              .map((t: { tag: Tag }) => t.tag.name)
                              .join(', ');
                          }

                          return (
                            <Box
                              sx={{ display: 'flex', flexDirection: 'column' }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                                sx={{ maxWidth: 220 }}
                              >
                                {name}
                              </Typography>

                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 0.5,
                                  flexWrap: 'wrap',
                                  pt: 0.25,
                                }}
                              >
                                {account.category && (
                                  <Chip
                                    label={account.category.name}
                                    size="small"
                                    sx={{
                                      bgcolor:
                                        account.category.color || '#6B7280',
                                      color: '#fff',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: 20,
                                    }}
                                  />
                                )}

                                {tagsText && (
                                  <Tooltip
                                    title={tagsTooltip}
                                    placement="top"
                                    arrow
                                  >
                                    <Chip
                                      label={tagsText}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        fontSize: '0.7rem',
                                        height: 20,
                                      }}
                                    />
                                  </Tooltip>
                                )}

                                {!account.category && !tagsText && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontStyle: 'italic' }}
                                  >
                                    Sem categoria
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="right">
                        {(() => {
                          const remainingTotal =
                            Number(account.amount) -
                            Number(
                              type === 'payable'
                                ? account.paidAmount
                                : account.receivedAmount || 0
                            );

                          const hasNextUnpaidAmount =
                            account.nextUnpaidAmount !== null &&
                            account.nextUnpaidAmount !== undefined;

                          const nextUnpaidAmount = hasNextUnpaidAmount
                            ? Number(account.nextUnpaidAmount)
                            : null;

                          const shownAmount =
                            nextUnpaidAmount ?? remainingTotal;
                          const showTotalHint =
                            hasNextUnpaidAmount &&
                            Math.abs(shownAmount - remainingTotal) > 0.009;

                          const dueDateLabel = account.nextUnpaidDueDate
                            ? formatLocalDate(account.nextUnpaidDueDate)
                            : '-';

                          const amountNode = (
                            <Typography variant="body2" fontWeight={700}>
                              {formatCurrency(shownAmount)}
                            </Typography>
                          );

                          return (
                            <Box
                              sx={{ display: 'flex', flexDirection: 'column' }}
                            >
                              {showTotalHint ? (
                                <Tooltip
                                  title={`Saldo total em aberto: ${formatCurrency(
                                    remainingTotal
                                  )}`}
                                  placement="top"
                                  arrow
                                >
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      justifyContent: 'flex-end',
                                    }}
                                  >
                                    {amountNode}
                                  </Box>
                                </Tooltip>
                              ) : (
                                amountNode
                              )}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {dueDateLabel}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
