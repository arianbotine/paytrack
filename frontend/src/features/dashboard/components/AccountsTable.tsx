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

interface Installment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  receivedAmount?: number;
  tags: { tag: Tag }[];
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
  installments?: Installment[];
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
  const renderTags = (account: Account) => {
    // Combine account tags with installment tags
    const accountTags = account.tags.map(t => t.tag);
    const installmentTags =
      account.installments?.[0]?.tags.map(t => t.tag) || [];
    const allTags = [...accountTags, ...installmentTags];

    // Remove duplicates based on tag id
    const uniqueTags = allTags.filter(
      (tag, index, self) => index === self.findIndex(t => t.id === tag.id)
    );

    if (uniqueTags.length === 0) return null;

    const visibleTags = uniqueTags.slice(0, 2);
    const hiddenTags = uniqueTags.slice(2);

    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {visibleTags.map(tag => (
          <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              backgroundColor: tag.color || '#e0e0e0',
              color: tag.color ? '#fff' : '#000',
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        ))}
        {hiddenTags.length > 0 && (
          <Tooltip
            title={
              <Box>
                {hiddenTags.map(tag => (
                  <Box key={tag.id} display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: tag.color || '#e0e0e0',
                      }}
                    />
                    {tag.name}
                  </Box>
                ))}
              </Box>
            }
          >
            <Chip
              label={`+${hiddenTags.length}`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: '#f5f5f5',
                color: '#666',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          </Tooltip>
        )}
      </Box>
    );
  };

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
              sx={{ borderRadius: 2, maxHeight: 400, overflow: 'auto' }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Conta</TableCell>
                    <TableCell align="right">Vencimento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.map((account, index) => (
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

                                {renderTags(account)}

                                {!account.category && !renderTags(account) && (
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
