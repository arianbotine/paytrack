import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Box,
  Typography,
  Alert,
  Button,
  Collapse,
  Divider,
  Chip,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { BatchAccount } from '../types';
import { PAYMENT_METHODS } from '../../payments/types';
import { getNowLocalDatetimeInput } from '../../../shared/utils/dateUtils';

interface BatchAccountPaymentSectionProps {
  account: BatchAccount;
  isDisabled: boolean;
  showPayment: boolean;
  paymentLabels: {
    title: string;
    verb: string;
    statusVerb: string;
    action: string;
  };
  totalPaymentAmount: number;
  formatCurrency: (value: number) => string;
  onTogglePayment: () => void;
  onTogglePaymentInstallment: (installmentNumber: number) => void;
  onPaymentFieldChange: (field: string, value: any) => void;
}

/**
 * Componente que renderiza toda a seção de registro de pagamento/recebimento.
 * Inclui seleção de parcelas, campos de pagamento e preview do impacto.
 */
export const BatchAccountPaymentSection: React.FC<
  BatchAccountPaymentSectionProps
> = ({
  account,
  isDisabled,
  showPayment,
  paymentLabels,
  totalPaymentAmount,
  formatCurrency,
  onTogglePayment,
  onTogglePaymentInstallment,
  onPaymentFieldChange,
}) => {
  return (
    <Grid item xs={12}>
      <Paper
        elevation={0}
        sx={{
          border: 1,
          borderColor: showPayment ? 'primary.main' : 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <Button
          fullWidth
          onClick={onTogglePayment}
          disabled={isDisabled}
          sx={{
            justifyContent: 'space-between',
            p: 1.5,
            textTransform: 'none',
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'transparent',
            },
          }}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: showPayment ? 'rotate(180deg)' : 'none',
                transition: '0.3s',
              }}
            />
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PaymentIcon color="primary" />
            <Typography fontWeight={600}>{paymentLabels.title}</Typography>
            <Chip label="Opcional" size="small" variant="outlined" />
            {account.payment?.installmentNumbers &&
              account.payment.installmentNumbers.length > 0 && (
                <Chip
                  label={`${account.payment.installmentNumbers.length} selecionadas`}
                  size="small"
                  color="success"
                  icon={<CheckCircleIcon />}
                />
              )}
          </Box>
        </Button>

        <Collapse in={showPayment}>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2.5}>
              {/* Seleção de Parcelas */}
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Selecione as parcelas a {paymentLabels.verb}
                </Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  {Array.from(
                    { length: account.installmentCount },
                    (_, i) => i + 1
                  ).map(installmentNum => {
                    const isSelected =
                      account.payment?.installmentNumbers?.includes(
                        installmentNum
                      ) || false;
                    const installmentAmount =
                      account.amount / account.installmentCount;
                    const dueDate = account.dueDates[installmentNum - 1];

                    return (
                      <Grid
                        item
                        xs={6}
                        sm={4}
                        md={3}
                        key={`payment-${installmentNum}`}
                      >
                        <Paper
                          onClick={() =>
                            !isDisabled &&
                            onTogglePaymentInstallment(installmentNum)
                          }
                          sx={{
                            p: 1.5,
                            cursor: isDisabled ? 'default' : 'pointer',
                            border: 2,
                            borderColor: isSelected
                              ? 'primary.main'
                              : 'divider',
                            bgcolor: isSelected
                              ? 'primary.lighter'
                              : 'background.paper',
                            transition: 'all 0.2s',
                            opacity: isDisabled ? 0.5 : 1,
                            '&:hover': {
                              borderColor: isDisabled
                                ? 'divider'
                                : 'primary.main',
                              bgcolor: isDisabled
                                ? undefined
                                : isSelected
                                  ? 'primary.lighter'
                                  : 'action.hover',
                              transform: isDisabled
                                ? 'none'
                                : 'translateY(-2px)',
                              boxShadow: isDisabled ? undefined : 2,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              {isSelected && (
                                <CheckCircleIcon
                                  fontSize="small"
                                  color="primary"
                                />
                              )}
                              <Chip
                                label={`${installmentNum}/${account.installmentCount}`}
                                size="small"
                                color={isSelected ? 'primary' : 'default'}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              fontWeight={isSelected ? 600 : 400}
                            >
                              {formatCurrency(installmentAmount)}
                            </Typography>
                            {dueDate && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {new Date(
                                  dueDate + 'T00:00:00'
                                ).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>

              {/* Campos do Pagamento */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label={`Data do ${paymentLabels.action}`}
                  type="datetime-local"
                  value={account.payment?.paymentDate || ''}
                  onChange={e =>
                    onPaymentFieldChange('paymentDate', e.target.value)
                  }
                  disabled={isDisabled}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    max: getNowLocalDatetimeInput(),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" disabled={isDisabled}>
                  <InputLabel>Método de Pagamento</InputLabel>
                  <Select
                    value={account.payment?.paymentMethod || ''}
                    onChange={e =>
                      onPaymentFieldChange('paymentMethod', e.target.value)
                    }
                    label="Método de Pagamento"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Referência/Comprovante (opcional)"
                  value={account.payment?.reference || ''}
                  onChange={e =>
                    onPaymentFieldChange('reference', e.target.value)
                  }
                  disabled={isDisabled}
                  fullWidth
                  size="small"
                  placeholder="Número do comprovante, PIX, etc."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Observações do Pagamento (opcional)"
                  value={account.payment?.notes || ''}
                  onChange={e => onPaymentFieldChange('notes', e.target.value)}
                  disabled={isDisabled}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Informações adicionais sobre o pagamento..."
                />
              </Grid>

              {/* Preview do Impacto */}
              {account.payment?.installmentNumbers &&
                account.payment.installmentNumbers.length > 0 && (
                  <Grid item xs={12}>
                    <Alert
                      severity="success"
                      icon={<CheckCircleIcon />}
                      sx={{
                        bgcolor: 'success.lighter',
                        '& .MuiAlert-icon': {
                          color: 'success.main',
                        },
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        Valor total: {formatCurrency(totalPaymentAmount)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        ✅ {account.payment.installmentNumbers.length}{' '}
                        {account.payment.installmentNumbers.length === 1
                          ? 'parcela ficará'
                          : 'parcelas ficarão'}{' '}
                        {paymentLabels.statusVerb}
                        {account.installmentCount -
                          account.payment.installmentNumbers.length >
                          0 && (
                          <>
                            {' • '}⏳{' '}
                            {account.installmentCount -
                              account.payment.installmentNumbers.length}{' '}
                            permanecerão pendentes
                          </>
                        )}
                      </Typography>
                    </Alert>
                  </Grid>
                )}

              {(!account.payment?.installmentNumbers ||
                account.payment.installmentNumbers.length === 0) && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                    Selecione as parcelas que deseja {paymentLabels.verb} agora.
                    Você só pode {paymentLabels.verb} parcelas completas.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </Collapse>
      </Paper>
    </Grid>
  );
};
