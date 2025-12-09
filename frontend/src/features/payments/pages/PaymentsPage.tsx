import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Typography,
  Grid,
  InputAdornment,
  TablePagination,
  FormHelperText,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  AccountBalance as PayableIcon,
  RequestQuote as ReceivableIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { useUIStore } from "../../../lib/stores/uiStore";

const paymentSchema = z
  .object({
    amount: z.coerce.number().positive("Valor deve ser positivo"),
    paymentDate: z.string().min(1, "Data do pagamento é obrigatória"),
    method: z.enum([
      "CASH",
      "CREDIT_CARD",
      "DEBIT_CARD",
      "BANK_TRANSFER",
      "PIX",
      "BOLETO",
      "CHECK",
      "OTHER",
    ]),
    reference: z.string().optional(),
    notes: z.string().optional(),
    payableId: z.string().optional(),
    receivableId: z.string().optional(),
  })
  .refine((data) => data.payableId || data.receivableId, {
    message: "Selecione uma conta a pagar ou a receber",
    path: ["payableId"],
  });

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Payable {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  vendor: { name: string };
}

interface Receivable {
  id: string;
  description: string;
  amount: number;
  receivedAmount: number;
  dueDate: string;
  status: string;
  customer: { name: string };
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  allocations: {
    id: string;
    amount: number;
    payable?: Payable;
    receivable?: Receivable;
  }[];
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
  { value: "DEBIT_CARD", label: "Cartão de Débito" },
  { value: "BANK_TRANSFER", label: "Transferência Bancária" },
  { value: "PIX", label: "PIX" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CHECK", label: "Cheque" },
  { value: "OTHER", label: "Outro" },
];

export const PaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const [searchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentType, setPaymentType] = useState<"PAYABLE" | "RECEIVABLE">(
    "PAYABLE"
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const preSelectedPayableId = searchParams.get("payableId");
  const preSelectedReceivableId = searchParams.get("receivableId");

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      method: "PIX",
      reference: "",
      notes: "",
      payableId: "",
      receivableId: "",
    },
  });

  const selectedPayableId = watch("payableId");
  const selectedReceivableId = watch("receivableId");

  // Open dialog with pre-selected account from URL params
  useEffect(() => {
    if (preSelectedPayableId || preSelectedReceivableId) {
      setPaymentType(preSelectedPayableId ? "PAYABLE" : "RECEIVABLE");
      setDialogOpen(true);
      reset({
        amount: 0,
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        method: "PIX",
        reference: "",
        notes: "",
        payableId: preSelectedPayableId || "",
        receivableId: preSelectedReceivableId || "",
      });
    }
  }, [preSelectedPayableId, preSelectedReceivableId, reset]);

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["payments", page, rowsPerPage],
    queryFn: async () => {
      const response = await api.get("/payments", {
        params: {
          skip: page * rowsPerPage,
          take: rowsPerPage,
        },
      });
      return response.data;
    },
  });

  const { data: pendingPayables = [] } = useQuery({
    queryKey: ["payables", "pending"],
    queryFn: async () => {
      const response = await api.get("/payables", {
        params: { status: "PENDING,PARTIAL,OVERDUE" },
      });
      return response.data.data || response.data;
    },
  });

  const { data: pendingReceivables = [] } = useQuery({
    queryKey: ["receivables", "pending"],
    queryFn: async () => {
      const response = await api.get("/receivables", {
        params: { status: "PENDING,PARTIAL,OVERDUE" },
      });
      return response.data.data || response.data;
    },
  });

  const selectedPayable = pendingPayables.find(
    (p: Payable) => p.id === selectedPayableId
  );
  const selectedReceivable = pendingReceivables.find(
    (r: Receivable) => r.id === selectedReceivableId
  );

  const createMutation = useMutation({
    mutationFn: (data: PaymentFormData) => {
      const payload = {
        ...data,
        payableId: data.payableId || undefined,
        receivableId: data.receivableId || undefined,
      };
      return api.post("/payments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Pagamento registrado com sucesso!", "success");
      handleCloseDialog();
    },
    onError: () => {
      showNotification("Erro ao registrar pagamento", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Pagamento excluído com sucesso!", "success");
      setDeleteDialogOpen(false);
      setSelectedPayment(null);
    },
    onError: () => {
      showNotification("Erro ao excluir pagamento", "error");
    },
  });

  const handleOpenDialog = () => {
    reset({
      amount: 0,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      method: "PIX",
      reference: "",
      notes: "",
      payableId: "",
      receivableId: "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    reset();
    // Clear URL params
    window.history.replaceState({}, "", "/payments");
  };

  const onSubmit = (data: PaymentFormData) => {
    createMutation.mutate(data);
  };

  const handleDelete = (payment: Payment) => {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPayment) {
      deleteMutation.mutate(selectedPayment.id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getMethodLabel = (method: string) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  };

  const payments = paymentsData?.data || [];
  const totalCount = paymentsData?.total || 0;

  return (
    <Box>
      <PageHeader
        title="Pagamentos"
        subtitle="Registre pagamentos e recebimentos"
        action={{ label: "Novo Pagamento", onClick: handleOpenDialog }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Método</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Referência</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhum pagamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment: Payment) => {
                const allocation = payment.allocations[0];
                const isPayable = !!allocation?.payable;
                return (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      {format(parseISO(payment.paymentDate), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      {isPayable ? (
                        <Chip
                          icon={<PayableIcon />}
                          label="Pagamento"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<ReceivableIcon />}
                          label="Recebimento"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography fontWeight="medium">
                          {isPayable
                            ? allocation?.payable?.description
                            : allocation?.receivable?.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isPayable
                            ? allocation?.payable?.vendor.name
                            : allocation?.receivable?.customer.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getMethodLabel(payment.method)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight="medium"
                        color={isPayable ? "error.main" : "success.main"}
                      >
                        {isPayable ? "-" : "+"} {formatCurrency(payment.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {payment.reference || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(payment)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Linhas por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </TableContainer>

      {/* Create Payment Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Novo Pagamento</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3, mt: 1 }}>
              <ToggleButtonGroup
                value={paymentType}
                exclusive
                onChange={(_, value) => {
                  if (value) {
                    setPaymentType(value);
                    setValue("payableId", "");
                    setValue("receivableId", "");
                    setValue("amount", 0);
                  }
                }}
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
                              (p: Payable) => p.id === e.target.value
                            );
                            if (payable) {
                              setValue(
                                "amount",
                                payable.amount - payable.paidAmount
                              );
                            }
                          }}
                        >
                          {pendingPayables.map((payable: Payable) => (
                            <MenuItem key={payable.id} value={payable.id}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  width: "100%",
                                }}
                              >
                                <span>
                                  {payable.description} - {payable.vendor.name}
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
                              (r: Receivable) => r.id === e.target.value
                            );
                            if (receivable) {
                              setValue(
                                "amount",
                                receivable.amount - receivable.receivedAmount
                              );
                            }
                          }}
                        >
                          {pendingReceivables.map((receivable: Receivable) => (
                            <MenuItem key={receivable.id} value={receivable.id}>
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
                            Já {paymentType === "PAYABLE" ? "Pago" : "Recebido"}
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
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
              color={paymentType === "PAYABLE" ? "error" : "success"}
            >
              {paymentType === "PAYABLE"
                ? "Registrar Pagamento"
                : "Registrar Recebimento"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Pagamento"
        message="Tem certeza que deseja excluir este pagamento? O saldo da conta será restaurado."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedPayment(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
};
