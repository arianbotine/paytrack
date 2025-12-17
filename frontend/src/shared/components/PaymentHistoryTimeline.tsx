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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Payment as PaymentIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../utils/currencyUtils';
import { formatLocalDate } from '../utils/dateUtils';
import type { PaymentHistoryItem } from '../../features/payments/types';

interface PaymentHistoryTimelineProps {
  accountType: 'payable' | 'receivable';
  totalAmount: number;
  paidAmount: number;
  payments: PaymentHistoryItem[];
  isLoading?: boolean;
  onAddPayment?: () => void;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de Débito',
  CREDIT_CARD: 'Cartão de Crédito',
  BANK_TRANSFER: 'Transferência',
  PIX: 'PIX',
  BANK_SLIP: 'Boleto',
  CHECK: 'Cheque',
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

                  return (
                    <Card
                      key={item.id}
                      variant="outlined"
                      sx={{
                        position: 'relative',
                        '&:hover': {
                          boxShadow: 2,
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          {/* Header */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                          >
                            <Stack spacing={0.5}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                              >
                                <CalendarIcon
                                  sx={{ fontSize: 16, color: 'text.secondary' }}
                                />
                                <Typography variant="body2" fontWeight={600}>
                                  {formatLocalDate(item.payment.paymentDate)}
                                </Typography>
                              </Stack>
                              <Chip
                                label={
                                  paymentMethodLabels[item.payment.method] ||
                                  item.payment.method
                                }
                                size="small"
                                color={
                                  paymentMethodColors[item.payment.method] ||
                                  'default'
                                }
                                sx={{ width: 'fit-content' }}
                              />
                            </Stack>

                            <Stack alignItems="flex-end" spacing={0.5}>
                              <Typography
                                variant="h6"
                                fontWeight={700}
                                color="primary.main"
                              >
                                {formatCurrency(item.amount)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Acumulado: {formatCurrency(runningBalance)}
                              </Typography>
                            </Stack>
                          </Stack>

                          {/* Details */}
                          {item.payment.notes && (
                            <Stack spacing={1} sx={{ pt: 1 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="flex-start"
                              >
                                <NotesIcon
                                  sx={{
                                    fontSize: 16,
                                    color: 'text.secondary',
                                  }}
                                />
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {item.payment.notes}
                                </Typography>
                              </Stack>
                            </Stack>
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
