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

const receivableSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(255),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  customerId: z.string().min(1, "Cliente é obrigatório"),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

type ReceivableFormData = z.infer<typeof receivableSchema>;

interface Customer {
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

interface Receivable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE" | "CANCELLED";
  receivedAmount: number;
  invoiceNumber?: string;
  notes?: string;
  customer: Customer;
  category?: Category;
  tags: { tag: Tag }[];
  createdAt: string;
}

export const ReceivablesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] =
    useState<Receivable | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceivableFormData>({
    resolver: zodResolver(receivableSchema),
    defaultValues: {
      description: "",
      amount: 0,
      dueDate: format(new Date(), "yyyy-MM-dd"),
      customerId: "",
      categoryId: "",
      tagIds: [],
      notes: "",
      invoiceNumber: "",
    },
  });

  const { data: receivablesData, isLoading } = useQuery({
    queryKey: ["receivables", statusFilter, page, rowsPerPage],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        skip: page * rowsPerPage,
        take: rowsPerPage,
      };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const response = await api.get("/receivables", { params });
      return response.data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await api.get("/customers");
      return response.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "RECEIVABLE"],
    queryFn: async () => {
      const response = await api.get("/categories", {
        params: { type: "RECEIVABLE" },
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
    mutationFn: (data: ReceivableFormData) => api.post("/receivables", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a receber criada com sucesso!", "success");
      handleCloseDialog();
    },
    onError: () => {
      showNotification("Erro ao criar conta a receber", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceivableFormData }) =>
      api.patch(`/receivables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a receber atualizada com sucesso!", "success");
      handleCloseDialog();
    },
    onError: () => {
      showNotification("Erro ao atualizar conta a receber", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/receivables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a receber excluída com sucesso!", "success");
      setDeleteDialogOpen(false);
      setSelectedReceivable(null);
    },
    onError: () => {
      showNotification("Erro ao excluir conta a receber", "error");
    },
  });

  const handleOpenDialog = (receivable?: Receivable) => {
    if (receivable) {
      setSelectedReceivable(receivable);
      reset({
        description: receivable.description,
        amount: receivable.amount,
        dueDate: format(parseISO(receivable.dueDate), "yyyy-MM-dd"),
        customerId: receivable.customer.id,
        categoryId: receivable.category?.id || "",
        tagIds: receivable.tags.map((t) => t.tag.id),
        notes: receivable.notes || "",
        invoiceNumber: receivable.invoiceNumber || "",
      });
    } else {
      setSelectedReceivable(null);
      reset({
        description: "",
        amount: 0,
        dueDate: format(new Date(), "yyyy-MM-dd"),
        customerId: "",
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
    setSelectedReceivable(null);
    reset();
  };

  const onSubmit = (data: ReceivableFormData) => {
    const payload = {
      ...data,
      categoryId: data.categoryId || undefined,
      tagIds: data.tagIds?.length ? data.tagIds : undefined,
    };

    if (selectedReceivable) {
      updateMutation.mutate({ id: selectedReceivable.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedReceivable) {
      deleteMutation.mutate(selectedReceivable.id);
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

  const receivables = receivablesData?.data || [];
  const totalCount = receivablesData?.total || 0;

  return (
    <Box>
      <PageHeader
        title="Contas a Receber"
        subtitle="Gerencie seus recebimentos"
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
            <MenuItem value="PAID">Recebido</MenuItem>
            <MenuItem value="CANCELLED">Cancelado</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Recebido</TableCell>
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
            ) : receivables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhuma conta a receber encontrada
                </TableCell>
              </TableRow>
            ) : (
              receivables.map((receivable: Receivable) => (
                <TableRow key={receivable.id} hover>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography fontWeight="medium">
                        {receivable.description}
                      </Typography>
                      {receivable.invoiceNumber && (
                        <Typography variant="caption" color="text.secondary">
                          NF: {receivable.invoiceNumber}
                        </Typography>
                      )}
                      {receivable.tags.length > 0 && (
                        <Box
                          sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}
                        >
                          {receivable.tags.map(({ tag }) => (
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
                  <TableCell>{receivable.customer.name}</TableCell>
                  <TableCell>
                    {receivable.category && (
                      <Chip
                        label={receivable.category.name}
                        size="small"
                        sx={{
                          backgroundColor:
                            receivable.category.color || "#e0e0e0",
                          color: "#fff",
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="medium">
                      {formatCurrency(receivable.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {format(parseISO(receivable.dueDate), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                      {getDueDateAlert(receivable.dueDate, receivable.status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={receivable.status} type="receivable" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={
                        receivable.receivedAmount > 0
                          ? "success.main"
                          : "text.secondary"
                      }
                    >
                      {formatCurrency(receivable.receivedAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Registrar Recebimento">
                      <IconButton
                        size="small"
                        color="success"
                        disabled={
                          receivable.status === "PAID" ||
                          receivable.status === "CANCELLED"
                        }
                        onClick={() => {
                          // Navigate to payments with pre-selected receivable
                          window.location.href = `/payments?receivableId=${receivable.id}`;
                        }}
                      >
                        <PaymentIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(receivable)}
                        disabled={receivable.status === "PAID"}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(receivable)}
                        disabled={receivable.receivedAmount > 0}
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
            {selectedReceivable
              ? "Editar Conta a Receber"
              : "Nova Conta a Receber"}
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
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.customerId}>
                      <InputLabel>Cliente</InputLabel>
                      <Select {...field} label="Cliente">
                        {customers.map((customer: Customer) => (
                          <MenuItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.customerId && (
                        <FormHelperText>
                          {errors.customerId.message}
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

            {selectedReceivable && selectedReceivable.receivedAmount > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Esta conta já possui recebimentos registrados no valor de{" "}
                {formatCurrency(selectedReceivable.receivedAmount)}.
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
              {selectedReceivable ? "Salvar" : "Criar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Conta a Receber"
        message={`Tem certeza que deseja excluir a conta "${selectedReceivable?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedReceivable(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
};
