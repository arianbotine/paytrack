import React, { useState } from "react";
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
  Autocomplete,
  InputAdornment,
  Alert,
  TablePagination,
  FormHelperText,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "../../../lib/api";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { StatusChip } from "../../../shared/components/StatusChip";
import { useUIStore } from "../../../lib/stores/uiStore";

const payableSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(255),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  vendorId: z.string().min(1, "Fornecedor é obrigatório"),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

type PayableFormData = z.infer<typeof payableSchema>;

interface Vendor {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface Payable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE" | "CANCELLED";
  paidAmount: number;
  invoiceNumber?: string;
  notes?: string;
  vendor: Vendor;
  category?: Category;
  tags: { tag: Tag }[];
  createdAt: string;
}

export const PayablesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayableFormData>({
    resolver: zodResolver(payableSchema),
    defaultValues: {
      description: "",
      amount: 0,
      dueDate: format(new Date(), "yyyy-MM-dd"),
      vendorId: "",
      categoryId: "",
      tagIds: [],
      notes: "",
      invoiceNumber: "",
    },
  });

  const {
    data: payablesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payables", statusFilter, page, rowsPerPage],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        skip: page * rowsPerPage,
        take: rowsPerPage,
      };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const response = await api.get("/payables", { params });
      return response.data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await api.get("/vendors");
      return response.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "PAYABLE"],
    queryFn: async () => {
      const response = await api.get("/categories", {
        params: { type: "PAYABLE" },
      });
      return response.data;
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const response = await api.get("/tags");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PayableFormData) => api.post("/payables", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a pagar criada com sucesso!", "success");
      handleCloseDialog();
    },
    onError: () => {
      showNotification("Erro ao criar conta a pagar", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayableFormData }) =>
      api.patch(`/payables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a pagar atualizada com sucesso!", "success");
      handleCloseDialog();
    },
    onError: () => {
      showNotification("Erro ao atualizar conta a pagar", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a pagar excluída com sucesso!", "success");
      setDeleteDialogOpen(false);
      setSelectedPayable(null);
    },
    onError: () => {
      showNotification("Erro ao excluir conta a pagar", "error");
    },
  });

  const handleOpenDialog = (payable?: Payable) => {
    if (payable) {
      setSelectedPayable(payable);
      reset({
        description: payable.description,
        amount: payable.amount,
        dueDate: format(parseISO(payable.dueDate), "yyyy-MM-dd"),
        vendorId: payable.vendor.id,
        categoryId: payable.category?.id || "",
        tagIds: payable.tags.map((t) => t.tag.id),
        notes: payable.notes || "",
        invoiceNumber: payable.invoiceNumber || "",
      });
    } else {
      setSelectedPayable(null);
      reset({
        description: "",
        amount: 0,
        dueDate: format(new Date(), "yyyy-MM-dd"),
        vendorId: "",
        categoryId: "",
        tagIds: [],
        notes: "",
        invoiceNumber: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPayable(null);
    reset();
  };

  const onSubmit = (data: PayableFormData) => {
    const payload = {
      ...data,
      categoryId: data.categoryId || undefined,
      tagIds: data.tagIds?.length ? data.tagIds : undefined,
    };

    if (selectedPayable) {
      updateMutation.mutate({ id: selectedPayable.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (payable: Payable) => {
    setSelectedPayable(payable);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPayable) {
      deleteMutation.mutate(selectedPayable.id);
    }
  };

  const getDueDateAlert = (dueDate: string, status: string) => {
    if (status === "PAID" || status === "CANCELLED") return null;

    const today = new Date();
    const due = parseISO(dueDate);
    const daysUntilDue = differenceInDays(due, today);

    if (status === "OVERDUE" || isAfter(today, due)) {
      return (
        <Tooltip title="Conta vencida!">
          <ErrorIcon color="error" fontSize="small" />
        </Tooltip>
      );
    }

    if (daysUntilDue <= 7) {
      return (
        <Tooltip title={`Vence em ${daysUntilDue} dias`}>
          <WarningIcon color="warning" fontSize="small" />
        </Tooltip>
      );
    }

    return null;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const payables = payablesData?.data || [];
  const totalCount = payablesData?.total || 0;

  return (
    <Box>
      <PageHeader
        title="Contas a Pagar"
        subtitle="Gerencie suas obrigações financeiras"
        action={{ label: "Nova Conta", onClick: () => handleOpenDialog() }}
      />

      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="PENDING">Pendente</MenuItem>
            <MenuItem value="OVERDUE">Vencido</MenuItem>
            <MenuItem value="PARTIAL">Parcial</MenuItem>
            <MenuItem value="PAID">Pago</MenuItem>
            <MenuItem value="CANCELLED">Cancelado</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao carregar contas a pagar: {error.message}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Fornecedor</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Pago</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : payables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhuma conta a pagar encontrada
                </TableCell>
              </TableRow>
            ) : (
              payables.map((payable: Payable) => (
                <TableRow key={payable.id} hover>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography fontWeight="medium">
                        {payable.description}
                      </Typography>
                      {payable.invoiceNumber && (
                        <Typography variant="caption" color="text.secondary">
                          NF: {payable.invoiceNumber}
                        </Typography>
                      )}
                      {payable.tags.length > 0 && (
                        <Box
                          sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}
                        >
                          {payable.tags.map(({ tag }) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                backgroundColor: tag.color || "#e0e0e0",
                                color: "#fff",
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{payable.vendor.name}</TableCell>
                  <TableCell>
                    {payable.category && (
                      <Chip
                        label={payable.category.name}
                        size="small"
                        sx={{
                          backgroundColor: payable.category.color || "#e0e0e0",
                          color: "#fff",
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="medium">
                      {formatCurrency(payable.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {format(parseISO(payable.dueDate), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                      {getDueDateAlert(payable.dueDate, payable.status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={payable.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={
                        payable.paidAmount > 0
                          ? "success.main"
                          : "text.secondary"
                      }
                    >
                      {formatCurrency(payable.paidAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Registrar Pagamento">
                      <IconButton
                        size="small"
                        color="success"
                        disabled={
                          payable.status === "PAID" ||
                          payable.status === "CANCELLED"
                        }
                        onClick={() => {
                          // Navigate to payments with pre-selected payable
                          window.location.href = `/payments?payableId=${payable.id}`;
                        }}
                      >
                        <PaymentIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(payable)}
                        disabled={payable.status === "PAID"}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(payable)}
                        disabled={payable.paidAmount > 0}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedPayable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Descrição"
                      fullWidth
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.vendorId}>
                      <InputLabel>Fornecedor</InputLabel>
                      <Select {...field} label="Fornecedor">
                        {vendors.map((vendor: Vendor) => (
                          <MenuItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.vendorId && (
                        <FormHelperText>
                          {errors.vendorId.message}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Categoria</InputLabel>
                      <Select {...field} label="Categoria">
                        <MenuItem value="">Sem categoria</MenuItem>
                        {categories.map((category: Category) => (
                          <MenuItem key={category.id} value={category.id}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  backgroundColor: category.color || "#e0e0e0",
                                }}
                              />
                              {category.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Valor"
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
                  name="dueDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Data de Vencimento"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.dueDate}
                      helperText={errors.dueDate?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="invoiceNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Número da Nota Fiscal"
                      fullWidth
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="tagIds"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      options={tags}
                      getOptionLabel={(option: Tag) => option.name}
                      value={tags.filter((tag: Tag) =>
                        field.value?.includes(tag.id)
                      )}
                      onChange={(_, newValue) => {
                        field.onChange(newValue.map((tag) => tag.id));
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Tags" />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={option.id}
                            label={option.name}
                            size="small"
                            sx={{
                              backgroundColor: option.color || "#e0e0e0",
                              color: "#fff",
                            }}
                          />
                        ))
                      }
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
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>

            {selectedPayable && selectedPayable.paidAmount > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Esta conta já possui pagamentos registrados no valor de{" "}
                {formatCurrency(selectedPayable.paidAmount)}.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {selectedPayable ? "Salvar" : "Criar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Conta a Pagar"
        message={`Tem certeza que deseja excluir a conta "${selectedPayable?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedPayable(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
};
