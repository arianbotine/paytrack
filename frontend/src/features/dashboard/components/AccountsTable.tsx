import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
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
  const entityLabel = type === 'payable' ? 'Credor' : 'Devedor';

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
                    <TableCell>Categoria & Tags</TableCell>
                    <TableCell>{entityLabel}</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="center">Vencimento</TableCell>
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
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            maxWidth: 250,
                          }}
                        >
                          {/* Categoria */}
                          {account.category && (
                            <Chip
                              label={account.category.name}
                              size="small"
                              sx={{
                                bgcolor: account.category.color || '#6B7280',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 22,
                              }}
                            />
                          )}

                          {/* Tags */}
                          {account.tags.map((tagItem: { tag: Tag }) => (
                            <Chip
                              key={tagItem.tag.id}
                              label={tagItem.tag.name}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: tagItem.tag.color || '#3B82F6',
                                color: tagItem.tag.color || '#3B82F6',
                                fontSize: '0.7rem',
                                height: 22,
                                fontWeight: 500,
                              }}
                            />
                          ))}

                          {/* Fallback se não houver categoria nem tags */}
                          {!account.category && account.tags.length === 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontStyle: 'italic', py: 0.5 }}
                            >
                              Sem categoria
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 120 }}
                        >
                          {account.vendor?.name || account.customer?.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(
                            Number(account.amount) -
                              Number(
                                type === 'payable'
                                  ? account.paidAmount
                                  : account.receivedAmount || 0
                              )
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            account.nextUnpaidDueDate
                              ? formatLocalDate(account.nextUnpaidDueDate)
                              : '-'
                          }
                          size="small"
                          color={alertColor}
                          variant="outlined"
                        />
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
