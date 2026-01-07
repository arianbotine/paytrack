import React, { useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  Alert,
  Typography,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  RequestQuote as ReceivableIcon,
  AccountBalance as PayableIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfDay, isAfter } from 'date-fns';
import {
  formatLocalDate,
  getNowLocalDatetimeInput,
} from '../../../shared/utils/dateUtils';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import { PAYMENT_METHODS, paymentSchema, getDefaultFormValues } from '../types';
import type { PaymentFormData } from '../types';
import type { ReceivableInstallment } from '../../receivables/types';
import type { PayableInstallment } from '../../payables/types';

interface QuickPaymentDialogProps {
  open: boolean;
  installment: ReceivableInstallment | PayableInstallment | null;
  type: 'RECEIVABLE' | 'PAYABLE';
  isSubmitting: boolean;
  onSubmit: (data: PaymentFormData) => void;
  onClose: () => void;
}

export const QuickPaymentDialog: React.FC<QuickPaymentDialogProps> = ({
  open,
  installment,
  type,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const amountRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: getDefaultFormValues(),
  });

  const amount = watch('amount');

  useEffect(() => {
    if (open && amountRef.current) {
      setTimeout(() => amountRef.current?.focus(), 100);
    }
  }, [open]);

  const installmentInfo = useMemo(() => {
    if (!installment) return null;

    const isReceivable = type === 'RECEIVABLE';
    const receivableInst = isReceivable
      ? (installment as ReceivableInstallment)
      : null;
    const payableInst = isReceivable
      ? null
      : (installment as PayableInstallment);

    return {
      installmentNumber: installment.installmentNumber,
      totalInstallments: installment.totalInstallments,
      amount: installment.amount,
      pendingAmount: isReceivable
        ? (receivableInst?.amount || 0) - (receivableInst?.receivedAmount || 0)
        : (payableInst?.amount || 0) - (payableInst?.paidAmount || 0),
      dueDate: installment.dueDate,
      status: installment.status,
      entityName: isReceivable
        ? receivableInst?.receivable?.customer?.name
        : payableInst?.payable?.vendor?.name,
    };
  }, [installment, type]);

  useEffect(() => {
    if (open && installment) {
      const defaultValues = getDefaultFormValues();
      const pendingAmount = installmentInfo?.pendingAmount || 0;

      reset({
        ...defaultValues,
        amount: pendingAmount,
        [type === 'RECEIVABLE'
          ? 'receivableInstallmentId'
          : 'payableInstallmentId']: installment.id,
      });
    }
  }, [open, installment, type, reset, installmentInfo]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const isOverdue = useMemo(() => {
    if (!installmentInfo) return false;
    const today = startOfDay(new Date());
    const dueDateString = installmentInfo.dueDate.split('T')[0];
    const due = startOfDay(new Date(dueDateString));
    const result = !isAfter(due, today) && installmentInfo.status === 'PENDING';
    return result;
  }, [installmentInfo]);

  const isPartialPayment = useMemo(() => {
    if (!installmentInfo || !amount) return false;
    return amount < installmentInfo.pendingAmount;
  }, [amount, installmentInfo]);

  if (!installmentInfo) return null;

  const isReceivable = type === 'RECEIVABLE';
  const buttonText = isReceivable
    ? 'Registrar Recebimento'
    : 'Registrar Pagamento';

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          fullScreen={fullScreen}
          PaperProps={
            {
              component: motion.div,
              initial: { opacity: 0, scale: 0.95, y: 20 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.95, y: 20 },
              transition: { duration: 0.2 },
            } as any
          }
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>
              <Stack direction="row" spacing={1} alignItems="center">
                {isReceivable ? (
                  <ReceivableIcon color="success" />
                ) : (
                  <PayableIcon color="error" />
                )}
                <Typography variant="h6" component="span">
                  Registrar {isReceivable ? 'Recebimento' : 'Pagamento'}
                </Typography>
              </Stack>
            </DialogTitle>

            <DialogContent>
              {/* Card com informações da parcela */}
              <Card
                sx={{
                  mb: 3,
                  background: theme =>
                    `linear-gradient(135deg, ${alpha(
                      isReceivable
                        ? theme.palette.success.main
                        : theme.palette.error.main,
                      0.05
                    )} 0%, ${alpha(
                      isReceivable
                        ? theme.palette.success.main
                        : theme.palette.error.main,
                      0.02
                    )} 100%)`,
                  border: 1,
                  borderColor: isReceivable ? 'success.main' : 'error.main',
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header da parcela */}
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {installmentInfo.entityName}
                        </Typography>
                      </Box>
                      <Chip
                        label={
                          installmentInfo.totalInstallments > 1
                            ? `${installmentInfo.installmentNumber}/${installmentInfo.totalInstallments}`
                            : 'Única'
                        }
                        size="small"
                        color={isReceivable ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </Box>

                    <Divider />

                    {/* Informações detalhadas */}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {isReceivable ? (
                            <PersonIcon fontSize="small" color="action" />
                          ) : (
                            <BusinessIcon fontSize="small" color="action" />
                          )}
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {isReceivable ? 'Cliente' : 'Credor'}
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {installmentInfo.entityName}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EventIcon fontSize="small" color="action" />
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Vencimento
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                color="text.primary"
                              >
                                {formatLocalDate(installmentInfo.dueDate)}
                              </Typography>
                              {isOverdue && (
                                <Chip
                                  label="Vencido"
                                  size="small"
                                  color="error"
                                  sx={{ height: 20 }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <MoneyIcon fontSize="small" color="action" />
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Valor Total
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formatCurrency(installmentInfo.amount)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TagIcon fontSize="small" color="action" />
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Valor Pendente
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              color={
                                isReceivable ? 'success.main' : 'error.main'
                              }
                            >
                              {formatCurrency(installmentInfo.pendingAmount)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>

              {/* Alerta de pagamento parcial */}
              {isPartialPayment && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Pagamento parcial detectado. O status da parcela será
                  atualizado para "PARCIAL".
                </Alert>
              )}

              {/* Formulário de pagamento */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Valor"
                        type="number"
                        fullWidth
                        required
                        error={!!errors.amount}
                        helperText={errors.amount?.message}
                        inputRef={amountRef}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">R$</InputAdornment>
                          ),
                        }}
                        inputProps={{
                          step: '0.01',
                          min: '0.01',
                          max: installmentInfo.pendingAmount,
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="paymentDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Data e Hora do Pagamento"
                        type="datetime-local"
                        fullWidth
                        required
                        error={!!errors.paymentDate}
                        helperText={errors.paymentDate?.message}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{
                          max: getNowLocalDatetimeInput(),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="method"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.method}>
                        <InputLabel>Forma de Pagamento</InputLabel>
                        <Select {...field} label="Forma de Pagamento">
                          {PAYMENT_METHODS.map(method => (
                            <MenuItem key={method.value} value={method.value}>
                              {method.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="reference"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Referência (Opcional)"
                        fullWidth
                        placeholder="Número do documento, comprovante, etc."
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Observações (Opcional)"
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Informações adicionais sobre o pagamento..."
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color={isReceivable ? 'success' : 'error'}
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
              >
                {buttonText}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
