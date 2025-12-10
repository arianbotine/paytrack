import React, { useEffect } from "react";
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
  FormHelperText,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AccountBalance as PayableIcon,
  RequestQuote as ReceivableIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import type {
  PaymentFormData,
  PaymentType,
  Payable,
  Receivable,
} from "../types";
import {
  paymentSchema,
  getDefaultFormValues,
  formatCurrency,
  PAYMENT_METHODS,
} from "../types";

interface PaymentFormDialogProps {
  open: boolean;
  paymentType: PaymentType;
  pendingPayables: Payable[];
  pendingReceivables: Receivable[];
  preSelectedPayableId?: string | null;
  preSelectedReceivableId?: string | null;
  isSubmitting: boolean;
  onPaymentTypeChange: (type: PaymentType) => void;
  onSubmit: (data: PaymentFormData) => void;
  onClose: () => void;
}

export const PaymentFormDialog: React.FC<PaymentFormDialogProps> = ({
  open,
  paymentType,
  pendingPayables,
  pendingReceivables,
  preSelectedPayableId,
  preSelectedReceivableId,
  isSubmitting,
  onPaymentTypeChange,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: getDefaultFormValues(),
  });

  const selectedPayableId = watch("payableId");
  const selectedReceivableId = watch("receivableId");

  const selectedPayable = pendingPayables.find(
    (p) => p.id === selectedPayableId
  );
  const selectedReceivable = pendingReceivables.find(
    (r) => r.id === selectedReceivableId
  );

  useEffect(() => {
    if (open) {
      if (preSelectedPayableId) {
        reset({
          ...getDefaultFormValues(),
          payableId: preSelectedPayableId,
        });
        const payable = pendingPayables.find(
          (p) => p.id === preSelectedPayableId
        );
        if (payable) {
          setValue("amount", payable.amount - payable.paidAmount);
        }
      } else if (preSelectedReceivableId) {
        reset({
          ...getDefaultFormValues(),
          receivableId: preSelectedReceivableId,
        });
        const receivable = pendingReceivables.find(
          (r) => r.id === preSelectedReceivableId
        );
        if (receivable) {
          setValue("amount", receivable.amount - receivable.receivedAmount);
        }
      } else {
        reset(getDefaultFormValues());
      }
    }
  }, [
    open,
    preSelectedPayableId,
    preSelectedReceivableId,
    pendingPayables,
    pendingReceivables,
    reset,
    setValue,
  ]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePaymentTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    value: PaymentType | null
  ) => {
    if (value) {
      onPaymentTypeChange(value);
      setValue("payableId", "");
      setValue("receivableId", "");
      setValue("amount", 0);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="md"
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
            <DialogTitle>Novo Pagamento</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3, mt: 1 }}>
                <ToggleButtonGroup
                  value={paymentType}
                  exclusive
                  onChange={handlePaymentTypeChange}
                  fullWidth
                >
                  <ToggleButton value="PAYABLE" color="error">
                    <PayableIcon sx={{ mr: 1 }} />
                    Pagar Conta
                  </ToggleButton>
                  <ToggleButton value="RECEIVABLE" color="success">
                    <ReceivableIcon sx={{ mr: 1 }} />
                    Receber Conta
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  {paymentType === "PAYABLE" ? (
                    <Controller
                      name="payableId"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.payableId}>
                          <InputLabel>Conta a Pagar</InputLabel>
                          <Select
                            {...field}
                            label="Conta a Pagar"
                            onChange={(e) => {
                              field.onChange(e);
                              const payable = pendingPayables.find(
                                (p) => p.id === e.target.value
                              );
                              if (payable) {
                                setValue(
                                  "amount",
                                  payable.amount - payable.paidAmount
                                );
                              }
                            }}
                          >
                            {pendingPayables.map((payable) => (
                              <MenuItem key={payable.id} value={payable.id}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    width: "100%",
                                  }}
                                >
                                  <span>
                                    {payable.description} -{" "}
                                    {payable.vendor.name}
                                  </span>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {formatCurrency(
                                      payable.amount - payable.paidAmount
                                    )}{" "}
                                    pendente
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.payableId && (
                            <FormHelperText>
                              {errors.payableId.message}
                            </FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  ) : (
                    <Controller
                      name="receivableId"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.receivableId}>
                          <InputLabel>Conta a Receber</InputLabel>
                          <Select
                            {...field}
                            label="Conta a Receber"
                            onChange={(e) => {
                              field.onChange(e);
                              const receivable = pendingReceivables.find(
                                (r) => r.id === e.target.value
                              );
                              if (receivable) {
                                setValue(
                                  "amount",
                                  receivable.amount - receivable.receivedAmount
                                );
                              }
                            }}
                          >
                            {pendingReceivables.map((receivable) => (
                              <MenuItem
                                key={receivable.id}
                                value={receivable.id}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    width: "100%",
                                  }}
                                >
                                  <span>
                                    {receivable.description} -{" "}
                                    {receivable.customer.name}
                                  </span>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {formatCurrency(
                                      receivable.amount -
                                        receivable.receivedAmount
                                    )}{" "}
                                    pendente
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.receivableId && (
                            <FormHelperText>
                              {errors.receivableId.message}
                            </FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  )}
                </Grid>

                {(selectedPayable || selectedReceivable) && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Detalhes da Conta
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Valor Total
                            </Typography>
                            <Typography>
                              {formatCurrency(
                                selectedPayable?.amount ||
                                  selectedReceivable?.amount ||
                                  0
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Já{" "}
                              {paymentType === "PAYABLE" ? "Pago" : "Recebido"}
                            </Typography>
                            <Typography>
                              {formatCurrency(
                                selectedPayable?.paidAmount ||
                                  selectedReceivable?.receivedAmount ||
                                  0
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Pendente
                            </Typography>
                            <Typography fontWeight="bold" color="primary">
                              {formatCurrency(
                                (selectedPayable?.amount ||
                                  selectedReceivable?.amount ||
                                  0) -
                                  (selectedPayable?.paidAmount ||
                                    selectedReceivable?.receivedAmount ||
                                    0)
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Vencimento
                            </Typography>
                            <Typography>
                              {format(
                                parseISO(
                                  selectedPayable?.dueDate ||
                                    selectedReceivable?.dueDate ||
                                    new Date().toISOString()
                                ),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Valor do Pagamento"
                        type="number"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">R$</InputAdornment>
                          ),
                        }}
                        error={!!errors.amount}
                        helperText={errors.amount?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="paymentDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Data do Pagamento"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.paymentDate}
                        helperText={errors.paymentDate?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="method"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.method}>
                        <InputLabel>Método de Pagamento</InputLabel>
                        <Select {...field} label="Método de Pagamento">
                          {PAYMENT_METHODS.map((method) => (
                            <MenuItem key={method.value} value={method.value}>
                              {method.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="reference"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Referência (comprovante, etc)"
                        fullWidth
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
                        label="Observações"
                        fullWidth
                        multiline
                        rows={2}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              {(selectedPayable || selectedReceivable) && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {paymentType === "PAYABLE"
                    ? "Após confirmar, a conta a pagar será atualizada automaticamente."
                    : "Após confirmar, a conta a receber será atualizada automaticamente."}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                color={paymentType === "PAYABLE" ? "error" : "success"}
              >
                {paymentType === "PAYABLE"
                  ? "Registrar Pagamento"
                  : "Registrar Recebimento"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
