import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
  Alert,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Payment as PaymentIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../utils/currencyUtils';
import {
  formatRelativeDatetime,
  formatLocalDatetime,
} from '../utils/dateUtils';
import type { PaymentHistoryItem } from '../../features/payments/types';

interface PaymentHistoryTimelineProps {
  accountType: 'payable' | 'receivable';
  totalAmount: number;
  paidAmount: number;
  payments: PaymentHistoryItem[];
  isLoading?: boolean;
  onAddPayment?: () => void;
  entityName?: string;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de Débito',
  CREDIT_CARD: 'Cartão de Crédito',
  BANK_TRANSFER: 'Transferência',
  PIX: 'PIX',
  BANK_SLIP: 'Boleto',
  CHECK: 'Cheque',
  ACCOUNT_DEBIT: 'Débito em Conta',
  OTHER: 'Outro',
};

const paymentMethodColors: Record<
  string,
  'success' | 'primary' | 'secondary' | 'warning' | 'info' | 'default'
> = {
  PIX: 'success',
  BANK_TRANSFER: 'primary',
  CASH: 'warning',
  DEBIT_CARD: 'info',
  CREDIT_CARD: 'secondary',
  BANK_SLIP: 'default',
  CHECK: 'default',
  ACCOUNT_DEBIT: 'primary',
  OTHER: 'default',
};

const getChipColor = (
  isPaid: boolean,
  paidAmount: number
): 'success' | 'warning' | 'default' => {
  if (isPaid) return 'success';
  if (paidAmount > 0) return 'warning';
  return 'default';
};

const getProgressBarColor = (isPaid: boolean, paidAmount: number): string => {
  if (isPaid) return 'success.main';
  if (paidAmount > 0) return 'warning.main';
  return 'primary.main';
};

export const PaymentHistoryTimeline = ({
  accountType,
  totalAmount,
  paidAmount,
  payments,
  isLoading = false,
  onAddPayment,
  entityName,
}: PaymentHistoryTimelineProps) => {
  const [expanded, setExpanded] = useState(true);

  const pendingAmount = totalAmount - paidAmount;
  const progressPercentage = (paidAmount / totalAmount) * 100;
  const isPaid = paidAmount >= totalAmount;
  const hasPayments = payments.length > 0;

  const getStatusColor = () => {
    if (isPaid) return 'success.main';
    if (paidAmount > 0) return 'warning.main';
    return 'text.secondary';
  };

  const getStatusText = () => {
    if (isPaid)
      return accountType === 'payable'
        ? 'Totalmente Pago'
        : 'Totalmente Recebido';
    if (paidAmount > 0)
      return accountType === 'payable'
        ? 'Parcialmente Pago'
        : 'Parcialmente Recebido';
    return accountType === 'payable' ? 'Não Pago' : 'Não Recebido';
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{
        border: 1,
        borderColor: 'divider',
        '&:before': { display: 'none' },
        boxShadow: 'none',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: 'background.default',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{ width: '100%', pr: 2 }}
        >
          <PaymentIcon color="primary" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Histórico de{' '}
              {accountType === 'payable' ? 'Pagamentos' : 'Recebimentos'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {payments.length}{' '}
              {payments.length === 1 ? 'registro' : 'registros'}
            </Typography>
          </Box>
          <Chip
            label={getStatusText()}
            color={getChipColor(isPaid, paidAmount)}
            size="small"
          />
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ width: '100%', py: 2 }}>
            <LinearProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Progress Card */}
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      Progresso
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color={getStatusColor()}
                    >
                      {progressPercentage.toFixed(1)}%
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(progressPercentage, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getProgressBarColor(isPaid, paidAmount),
                      },
                    }}
                  />

                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(totalAmount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {accountType === 'payable' ? 'Pago' : 'Recebido'}
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color="success.main"
                      >
                        {formatCurrency(paidAmount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Pendente
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color="warning.main"
                      >
                        {formatCurrency(pendingAmount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Add Payment Button */}
            {onAddPayment && !isPaid && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAddPayment}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Adicionar{' '}
                {accountType === 'payable' ? 'Pagamento' : 'Recebimento'}
              </Button>
            )}

            {/* Payment Timeline */}
            {hasPayments ? (
              <Stack spacing={2} divider={<Divider />}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ pt: 1 }}
                >
                  Timeline de{' '}
                  {accountType === 'payable' ? 'Pagamentos' : 'Recebimentos'}
                </Typography>

                {payments.map((item, index) => {
                  const runningBalance = payments
                    .slice(0, index + 1)
                    .reduce((sum, p) => sum + p.amount, 0);
                  const isLast = index === payments.length - 1;

                  return (
                    <Card
                      key={item.id}
                      elevation={0}
                      sx={{
                        position: 'relative',
                        border: '2px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        overflow: 'visible',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: 4,
                          borderColor: 'primary.main',
                          transform: 'translateY(-2px)',
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: -20,
                          top: 24,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          border: '3px solid',
                          borderColor: 'background.paper',
                          zIndex: 2,
                        },
                        '&::after': isLast
                          ? {}
                          : {
                              content: '""',
                              position: 'absolute',
                              left: -14.5,
                              top: 36,
                              width: 2,
                              height: 'calc(100% + 16px)',
                              bgcolor: 'divider',
                              zIndex: 1,
                            },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={2.5}>
                          {/* Informação de Parcela - Design discreto */}
                          {item.allocations.length > 0 &&
                            item.allocations[0].installmentNumber && (
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mb: 0.5 }}
                              >
                                <ReceiptIcon
                                  sx={{
                                    fontSize: 16,
                                    color: 'primary.main',
                                    opacity: 0.7,
                                  }}
                                />
                                <Chip
                                  label={`Parcela ${item.allocations[0].installmentNumber}`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 24,
                                    borderRadius: 1,
                                  }}
                                />
                              </Stack>
                            )}

                          {/* Informação do Credor/Devedor */}
                          {entityName && (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ mb: 0.5 }}
                            >
                              <PersonIcon
                                sx={{
                                  fontSize: 16,
                                  color:
                                    accountType === 'payable'
                                      ? 'error.main'
                                      : 'success.main',
                                  opacity: 0.7,
                                }}
                              />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontWeight={500}
                              >
                                {accountType === 'payable'
                                  ? 'Credor'
                                  : 'Devedor'}
                                : {entityName}
                              </Typography>
                            </Stack>
                          )}

                          {/* Informações do Pagamento */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                              p: 2,
                              bgcolor: 'background.default',
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Stack spacing={1}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <CalendarIcon
                                  sx={{ fontSize: 18, color: 'primary.main' }}
                                />
                                <Tooltip
                                  title={formatLocalDatetime(item.paymentDate)}
                                >
                                  <Typography variant="body2" fontWeight={600}>
                                    {formatRelativeDatetime(item.paymentDate)}
                                  </Typography>
                                </Tooltip>
                              </Stack>
                              <Chip
                                label={
                                  paymentMethodLabels[item.paymentMethod] ||
                                  item.paymentMethod
                                }
                                size="small"
                                color={
                                  paymentMethodColors[item.paymentMethod] ||
                                  'default'
                                }
                                sx={{ width: 'fit-content' }}
                              />
                            </Stack>

                            <Stack alignItems="flex-end" spacing={0.5}>
                              <Typography
                                variant="h5"
                                fontWeight={700}
                                color="success.main"
                                sx={{
                                  textShadow:
                                    '0 2px 4px rgba(76, 175, 80, 0.2)',
                                }}
                              >
                                {formatCurrency(item.amount)}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                              >
                                <TrendingUpIcon
                                  sx={{ fontSize: 14, color: 'text.secondary' }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Acum: {formatCurrency(runningBalance)}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Stack>

                          {/* Notas Adicionais */}
                          {item.notes && (
                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                bgcolor: 'warning.50',
                                border: '1px solid',
                                borderColor: 'warning.200',
                                borderRadius: 1.5,
                                borderLeft: '4px solid',
                                borderLeftColor: 'warning.main',
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="flex-start"
                              >
                                <NotesIcon
                                  sx={{
                                    fontSize: 20,
                                    color: 'warning.main',
                                    mt: 0.25,
                                  }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography
                                    variant="caption"
                                    fontWeight={600}
                                    color="warning.dark"
                                    display="block"
                                  >
                                    Observações
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                  >
                                    {item.notes}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Alert severity="info" icon={<PaymentIcon />}>
                Nenhum {accountType === 'payable' ? 'pagamento' : 'recebimento'}{' '}
                registrado ainda.
                {onAddPayment &&
                  ' Clique no botão acima para adicionar o primeiro.'}
              </Alert>
            )}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
