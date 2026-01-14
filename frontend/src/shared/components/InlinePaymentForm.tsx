import React, { useMemo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Stack,
  Chip,
  Paper,
  Box,
  FormHelperText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Controller, Control, UseFormWatch } from 'react-hook-form';
import { PAYMENT_METHODS } from '../../features/payments/types';
import { formatCurrency } from '../utils/currencyUtils';
import { getNowLocalDatetimeInput } from '../utils/dateUtils';

interface InstallmentPreview {
  number: number;
  dueDate: string;
  amount: number;
}

interface InlinePaymentFormProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  errors: any;
  installmentPreview: InstallmentPreview[];
  accountType: 'payable' | 'receivable';
}

export const InlinePaymentForm: React.FC<InlinePaymentFormProps> = ({
  control,
  watch,
  errors,
  installmentPreview,
  accountType,
}) => {
  // Watch para cálculo do valor total
  const selectedInstallmentNumbers = watch('payment.installmentNumbers') || [];
  const paymentDate = watch('payment.paymentDate');

  // Calcular valor total baseado nas parcelas selecionadas
  const totalPaymentAmount = useMemo(() => {
    const selected = watch('payment.installmentNumbers') || [];
    if (!selected.length || !installmentPreview.length) {
      return 0;
    }
    return selected.reduce((sum: number, num: number) => {
      const installment = installmentPreview.find(p => p.number === num);
      return sum + (installment?.amount || 0);
    }, 0);
  }, [installmentPreview, watch]);

  // Validar se data é hoje ou anterior
  const isValidPaymentDate = useMemo(() => {
    if (!paymentDate) return true;
    const selected = new Date(paymentDate);
    const now = new Date();
    return selected <= now;
  }, [paymentDate]);

  // Função auxiliar para toggle de parcelas
  const toggleInstallment = (fieldValue: number[], number: number) => {
    const isIncluded = fieldValue.includes(number);
    if (isIncluded) {
      return fieldValue.filter((n: number) => n !== number);
    } else {
      return [...fieldValue, number].sort((a: number, b: number) => a - b);
    }
  };

  // Labels contextuais
  const labels = {
    payable: {
      title: 'Registrar Pagamento Agora?',
      installmentLabel: 'Selecione as parcelas a pagar',
      totalLabel: 'Valor total do pagamento',
      dateLabel: 'Data do pagamento',
      successMessage: 'parcelas ficarão pagas',
      pendingMessage: 'parcelas permanecerão pendentes',
    },
    receivable: {
      title: 'Registrar Recebimento Agora?',
      installmentLabel: 'Selecione as parcelas a receber',
      totalLabel: 'Valor total do recebimento',
      dateLabel: 'Data do recebimento',
      successMessage: 'parcelas ficarão recebidas',
      pendingMessage: 'parcelas permanecerão pendentes',
    },
  };

  const currentLabels = labels[accountType];

  // Contadores de status
  const paidCount = selectedInstallmentNumbers.length;
  const pendingCount = installmentPreview.length - paidCount;

  return (
    <Accordion
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        '&:before': { display: 'none' },
        '&.Mui-expanded': {
          borderColor: 'primary.main',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <PaymentIcon color="primary" />
          <Typography fontWeight={600}>{currentLabels.title}</Typography>
          <Chip label="Opcional" size="small" variant="outlined" />
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Grid de seleção de parcelas */}
          {installmentPreview.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                {currentLabels.installmentLabel}
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                {installmentPreview.map(preview => {
                  const isSelected = selectedInstallmentNumbers.includes(
                    preview.number
                  );
                  return (
                    <Grid item xs={6} sm={4} md={3} key={preview.number}>
                      <Controller
                        name="payment.installmentNumbers"
                        control={control}
                        defaultValue={[]}
                        render={({ field }) => (
                          <Paper
                            onClick={() =>
                              field.onChange(
                                toggleInstallment(
                                  field.value || [],
                                  preview.number
                                )
                              )
                            }
                            sx={{
                              p: 1.5,
                              cursor: 'pointer',
                              border: 2,
                              borderColor: isSelected
                                ? 'primary.main'
                                : 'divider',
                              bgcolor: isSelected
                                ? 'primary.lighter'
                                : 'background.paper',
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: isSelected
                                  ? 'primary.lighter'
                                  : 'action.hover',
                                transform: 'translateY(-2px)',
                                boxShadow: 2,
                              },
                            }}
                          >
                            <Stack spacing={0.5} alignItems="center">
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                              >
                                {isSelected && (
                                  <CheckCircleIcon
                                    fontSize="small"
                                    color="primary"
                                  />
                                )}
                                <Chip
                                  label={`${preview.number}/${installmentPreview.length}`}
                                  size="small"
                                  color={isSelected ? 'primary' : 'default'}
                                />
                              </Stack>
                              <Typography
                                variant="body2"
                                fontWeight={isSelected ? 600 : 400}
                              >
                                {formatCurrency(preview.amount)}
                              </Typography>
                            </Stack>
                          </Paper>
                        )}
                      />
                    </Grid>
                  );
                })}
              </Grid>
              {errors?.payment?.message && (
                <FormHelperText error sx={{ mt: 1 }}>
                  {errors.payment.message}
                </FormHelperText>
              )}
            </Box>
          )}

          {/* Campos do formulário de pagamento */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="payment.paymentDate"
                control={control}
                defaultValue={getNowLocalDatetimeInput()}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={`${currentLabels.dateLabel}${selectedInstallmentNumbers.length === 0 ? ' (opcional)' : ''}`}
                    type="datetime-local"
                    required={selectedInstallmentNumbers.length > 0}
                    error={
                      !!errors?.payment?.paymentDate || !isValidPaymentDate
                    }
                    helperText={
                      errors?.payment?.paymentDate?.message ||
                      (!isValidPaymentDate &&
                        'Data do pagamento não pode ser futura')
                    }
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      max: getNowLocalDatetimeInput(),
                    }}
                    sx={{
                      '& .MuiInputBase-root': {
                        minHeight: '54px',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="payment.paymentMethod"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <FormControl
                    fullWidth
                    error={!!errors?.payment?.paymentMethod}
                    required={selectedInstallmentNumbers.length > 0}
                  >
                    <InputLabel>
                      Método de Pagamento
                      {selectedInstallmentNumbers.length === 0 && ' (opcional)'}
                    </InputLabel>
                    <Select
                      {...field}
                      label={`Método de Pagamento${selectedInstallmentNumbers.length === 0 ? ' (opcional)' : ''}`}
                    >
                      {PAYMENT_METHODS.map(method => (
                        <MenuItem key={method.value} value={method.value}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors?.payment?.paymentMethod && (
                      <FormHelperText>
                        {errors.payment.paymentMethod.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="payment.reference"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Referência/Comprovante (opcional)"
                    placeholder="Número do comprovante, PIX, etc."
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="payment.notes"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Observações (opcional)"
                    multiline
                    rows={2}
                    placeholder="Informações adicionais sobre o pagamento..."
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Preview do impacto nas parcelas */}
          {selectedInstallmentNumbers.length > 0 && (
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
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {currentLabels.totalLabel}:{' '}
                  {formatCurrency(totalPaymentAmount)}
                </Typography>
                <Stack direction="row" spacing={3} flexWrap="wrap">
                  {paidCount > 0 && (
                    <Typography variant="body2">
                      ✅ {paidCount} {currentLabels.successMessage}
                    </Typography>
                  )}
                  {pendingCount > 0 && (
                    <Typography variant="body2">
                      ⏳ {pendingCount} {currentLabels.pendingMessage}
                    </Typography>
                  )}
                </Stack>

                {/* Mini grid de status visual */}
                {installmentPreview.length <= 12 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      gutterBottom
                    >
                      Status após o pagamento:
                    </Typography>
                    <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                      {installmentPreview.map(preview => {
                        const willBePaid = selectedInstallmentNumbers.includes(
                          preview.number
                        );
                        return (
                          <Grid item xs={3} sm={2} key={preview.number}>
                            <Chip
                              size="small"
                              label={`#${preview.number}`}
                              color={willBePaid ? 'success' : 'default'}
                              sx={{
                                width: '100%',
                                fontWeight: willBePaid ? 600 : 400,
                              }}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                )}
              </Stack>
            </Alert>
          )}

          {selectedInstallmentNumbers.length === 0 && (
            <Alert severity="info">
              Selecione as parcelas que deseja pagar agora. Você só pode pagar
              parcelas completas (não é permitido pagamento parcial durante a
              criação).
            </Alert>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
