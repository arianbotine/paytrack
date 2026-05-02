import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Autocomplete,
  Chip,
  useMediaQuery,
  useTheme,
  Typography,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Stack,
  CircularProgress,
  LinearProgress,
  Collapse,
  Fade,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type {
  PayableInstallment,
  Payable,
  Tag,
  PayableInstallmentItem,
  PayableInstallmentItemsSummary,
} from '../types';
import { CurrencyField } from '../../../shared/components';
import { QuickCreateTag } from '../../../shared/components/QuickCreateTag';
import { toLocalDateInput } from '../../../shared/utils/dateUtils';
import { formatCurrency } from '../../../shared/utils/currencyUtils';

// Schema de validação
const editInstallmentSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo').optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

type EditInstallmentFormData = z.infer<typeof editInstallmentSchema>;

interface EditInstallmentDialogProps {
  open: boolean;
  installment: PayableInstallment | null;
  payable: Payable | null;
  tags: Tag[];
  isSubmitting: boolean;
  installmentItems: PayableInstallmentItem[];
  itemsSummary?: PayableInstallmentItemsSummary;
  isLoadingItems?: boolean;
  isMutatingItems?: boolean;
  onCreateItem: (data: {
    description: string;
    amount: number;
    tagIds?: string[];
  }) => void;
  onUpdateItem: (
    itemId: string,
    data: {
      description?: string;
      amount?: number;
      tagIds?: string[];
    }
  ) => void;
  onDeleteItem: (itemId: string) => void;
  onSubmit: (data: EditInstallmentFormData) => void;
  onClose: () => void;
}

export const EditInstallmentDialog: React.FC<EditInstallmentDialogProps> = ({
  open,
  installment,
  payable,
  tags,
  isSubmitting,
  installmentItems,
  itemsSummary,
  isLoadingItems = false,
  isMutatingItems = false,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [quickTagOpen, setQuickTagOpen] = useState(false);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemAmount, setNewItemAmount] = useState<number | null>(null);
  const [newItemTagIds, setNewItemTagIds] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemDescription, setEditingItemDescription] = useState('');
  const [editingItemAmount, setEditingItemAmount] = useState<number | null>(
    null
  );
  const [editingItemTagIds, setEditingItemTagIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Determinar se campos de valor/data devem ser desabilitados
  const canEditAmountAndDate =
    installment?.status === 'PENDING' && (installment?.paidAmount ?? 0) === 0;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditInstallmentFormData>({
    resolver: zodResolver(editInstallmentSchema),
    defaultValues: {
      amount: installment?.amount || 0,
      dueDate: installment ? toLocalDateInput(installment.dueDate) : '',
      notes: installment?.notes || '',
      tagIds: installment?.tags?.map(t => t.tag.id) || [],
    },
  });

  // Reset form quando installment mudar
  React.useEffect(() => {
    if (installment) {
      reset({
        amount: installment.amount,
        dueDate: toLocalDateInput(installment.dueDate),
        notes: installment.notes || '',
        tagIds: installment.tags?.map(t => t.tag.id) || [],
      });
    }

    setNewItemDescription('');
    setNewItemAmount(null);
    setNewItemTagIds([]);
    setEditingItemId(null);
    setEditingItemDescription('');
    setEditingItemAmount(null);
    setEditingItemTagIds([]);
    setShowAddForm(false);
    setDeleteConfirmId(null);
  }, [installment, reset]);

  const handleFormSubmit = (data: EditInstallmentFormData) => {
    onSubmit(data);
  };

  const summary = useMemo(() => {
    if (!installment) {
      return {
        installmentAmount: 0,
        itemsTotal: 0,
        remainingAmountForItems: 0,
      };
    }

    if (itemsSummary) {
      return itemsSummary;
    }

    const calculatedTotal = installmentItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    return {
      installmentAmount: installment.amount,
      itemsTotal: calculatedTotal,
      remainingAmountForItems: installment.amount - calculatedTotal,
    };
  }, [installment, installmentItems, itemsSummary]);

  const canCreateItem =
    newItemDescription.trim().length > 0 && (newItemAmount ?? 0) > 0;

  const handleCreateItem = () => {
    if (!canCreateItem) return;

    onCreateItem({
      description: newItemDescription.trim(),
      amount: newItemAmount ?? 0,
      tagIds: newItemTagIds.length > 0 ? newItemTagIds : undefined,
    });

    setNewItemDescription('');
    setNewItemAmount(null);
    setNewItemTagIds([]);
    setShowAddForm(false);
  };

  const handleStartEditingItem = (item: PayableInstallmentItem) => {
    setEditingItemId(item.id);
    setEditingItemDescription(item.description);
    setEditingItemAmount(item.amount);
    setEditingItemTagIds(item.tags.map(tag => tag.id));
  };

  const handleCancelEditingItem = () => {
    setEditingItemId(null);
    setEditingItemDescription('');
    setEditingItemAmount(null);
    setEditingItemTagIds([]);
  };

  const handleSaveEditingItem = () => {
    if (!editingItemId) return;
    if (!editingItemDescription.trim()) return;
    if ((editingItemAmount ?? 0) <= 0) return;

    onUpdateItem(editingItemId, {
      description: editingItemDescription.trim(),
      amount: editingItemAmount ?? undefined,
      tagIds: editingItemTagIds,
    });

    handleCancelEditingItem();
  };

  const handleDeleteItem = (itemId: string) => {
    setDeleteConfirmId(itemId);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    onDeleteItem(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  if (!installment || !payable) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle>
          Editar Parcela {installment.installmentNumber}/
          {installment.totalInstallments}
          <Typography variant="body2" color="text.secondary">
            {payable.vendor.name}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!canEditAmountAndDate && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Apenas observações e tags podem ser editadas para parcelas que
                  não estão pendentes ou possuem pagamentos registrados.
                </Alert>
              )}

              <Grid container spacing={2}>
                {/* Valor */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <CurrencyField
                        label="Valor"
                        fullWidth
                        value={field.value || 0}
                        onChange={field.onChange}
                        error={!!errors.amount}
                        helperText={errors.amount?.message}
                        disabled={!canEditAmountAndDate || isSubmitting}
                        required
                      />
                    )}
                  />
                </Grid>

                {/* Data de Vencimento */}
                <Grid item xs={12} sm={6}>
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
                        disabled={!canEditAmountAndDate || isSubmitting}
                        required
                      />
                    )}
                  />
                </Grid>

                {/* Tags */}
                <Grid item xs={12}>
                  <Box
                    sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}
                  >
                    <Controller
                      name="tagIds"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          options={tags}
                          getOptionLabel={option => option.name}
                          value={tags.filter(tag =>
                            field.value?.includes(tag.id)
                          )}
                          onChange={(_, newValue) => {
                            field.onChange(newValue.map(tag => tag.id));
                          }}
                          disabled={isSubmitting}
                          renderInput={params => (
                            <TextField
                              {...params}
                              label="Tags"
                              placeholder="Selecione tags"
                              error={!!errors.tagIds}
                              helperText={errors.tagIds?.message}
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                {...getTagProps({ index })}
                                key={option.id}
                                label={option.name}
                                size="small"
                                sx={{
                                  bgcolor: option.color || '#e0e0e0',
                                  color: '#fff',
                                  '& .MuiChip-deleteIcon': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    '&:hover': {
                                      color: '#fff',
                                    },
                                  },
                                }}
                              />
                            ))
                          }
                          sx={{ flexGrow: 1 }}
                        />
                      )}
                    />
                    <Tooltip title="Criar nova tag" arrow>
                      <IconButton
                        onClick={() => setQuickTagOpen(true)}
                        disabled={isSubmitting}
                        sx={{
                          mt: 0.5,
                          color: 'primary.main',
                          backgroundColor: 'primary.lighter',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>

                {/* Observações */}
                <Grid item xs={12}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Observações"
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Adicione observações sobre esta parcela"
                        error={!!errors.notes}
                        helperText={errors.notes?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Itens detalhados da parcela
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Os itens são opcionais e servem para detalhamento. Eles não
                    alteram automaticamente o valor da parcela.
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  {/* Budget Summary Bar */}
                  {(() => {
                    const usageRatio =
                      summary.installmentAmount > 0
                        ? summary.itemsTotal / summary.installmentAmount
                        : 0;
                    const isOver = summary.remainingAmountForItems < 0;
                    const isNear = usageRatio >= 0.85 && !isOver;
                    const barColor = isOver
                      ? 'error'
                      : isNear
                        ? 'warning'
                        : 'success';

                    return (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderColor: isOver
                            ? 'error.main'
                            : isNear
                              ? 'warning.main'
                              : 'divider',
                          borderRadius: 2,
                          bgcolor: isOver
                            ? 'error.50'
                            : isNear
                              ? 'warning.50'
                              : 'background.paper',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.75,
                            flexWrap: 'wrap',
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}
                          >
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                Parcela
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(summary.installmentAmount)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                Itens
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={isOver ? 'error.main' : 'text.primary'}
                              >
                                {formatCurrency(summary.itemsTotal)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                Disponível
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={
                                  isOver
                                    ? 'error.main'
                                    : isNear
                                      ? 'warning.main'
                                      : 'success.main'
                                }
                              >
                                {formatCurrency(
                                  summary.remainingAmountForItems
                                )}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography
                            variant="caption"
                            color={
                              isOver
                                ? 'error.main'
                                : isNear
                                  ? 'warning.main'
                                  : 'text.secondary'
                            }
                            fontWeight={500}
                          >
                            {Math.min(Math.round(usageRatio * 100), 100)}%
                            utilizado
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(usageRatio * 100, 100)}
                          color={barColor}
                          sx={{ borderRadius: 1, height: 6 }}
                        />
                      </Paper>
                    );
                  })()}
                </Grid>

                <Grid item xs={12}>
                  {isLoadingItems ? (
                    <Box
                      sx={{
                        py: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">
                        Carregando itens...
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {installmentItems.length === 0 && !showAddForm && (
                        <Fade in>
                          <Box
                            sx={{
                              py: 3,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 1,
                              color: 'text.secondary',
                            }}
                          >
                            <LabelIcon sx={{ fontSize: 36, opacity: 0.3 }} />
                            <Typography variant="body2" color="text.secondary">
                              Nenhum item detalhado cadastrado para esta
                              parcela.
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              variant="outlined"
                              onClick={() => setShowAddForm(true)}
                              disabled={isMutatingItems}
                            >
                              Adicionar primeiro item
                            </Button>
                          </Box>
                        </Fade>
                      )}

                      {installmentItems.map(item => {
                        const isEditing = editingItemId === item.id;
                        const isDeleting = deleteConfirmId === item.id;
                        return (
                          <Fade in key={item.id}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                borderColor: isEditing
                                  ? 'primary.main'
                                  : isDeleting
                                    ? 'error.main'
                                    : 'divider',
                                borderRadius: 2,
                                transition: 'border-color 0.2s',
                                opacity:
                                  isMutatingItems && !isEditing ? 0.6 : 1,
                              }}
                            >
                              {isEditing ? (
                                <Grid
                                  container
                                  spacing={1.5}
                                  alignItems="flex-start"
                                >
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      value={editingItemDescription}
                                      onChange={e =>
                                        setEditingItemDescription(
                                          e.target.value
                                        )
                                      }
                                      label="Descrição"
                                      fullWidth
                                      size="small"
                                      autoFocus
                                      disabled={isMutatingItems}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={3}>
                                    <CurrencyField
                                      label="Valor"
                                      value={editingItemAmount || 0}
                                      onChange={setEditingItemAmount}
                                      fullWidth
                                      size="small"
                                      disabled={isMutatingItems}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={3}>
                                    <Autocomplete
                                      multiple
                                      options={tags}
                                      getOptionLabel={option => option.name}
                                      value={tags.filter(tag =>
                                        editingItemTagIds.includes(tag.id)
                                      )}
                                      onChange={(_, newValue) => {
                                        setEditingItemTagIds(
                                          newValue.map(tag => tag.id)
                                        );
                                      }}
                                      size="small"
                                      disabled={isMutatingItems}
                                      renderInput={params => (
                                        <TextField
                                          {...params}
                                          label="Tags"
                                          placeholder="Selecione"
                                        />
                                      )}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={2}>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: 0.5,
                                        mt: { xs: 0, sm: 0.5 },
                                      }}
                                    >
                                      <Tooltip title="Salvar" arrow>
                                        <span>
                                          <IconButton
                                            color="success"
                                            size="small"
                                            onClick={handleSaveEditingItem}
                                            disabled={isMutatingItems}
                                          >
                                            <CheckIcon fontSize="small" />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                      <Tooltip title="Cancelar" arrow>
                                        <span>
                                          <IconButton
                                            size="small"
                                            onClick={handleCancelEditingItem}
                                            disabled={isMutatingItems}
                                          >
                                            <CloseIcon fontSize="small" />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    </Box>
                                  </Grid>
                                </Grid>
                              ) : isDeleting ? (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="error.main"
                                    fontWeight={500}
                                  >
                                    Excluir "{item.description}"?
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="contained"
                                      onClick={handleConfirmDelete}
                                      disabled={isMutatingItems}
                                      startIcon={<DeleteIcon />}
                                    >
                                      Excluir
                                    </Button>
                                    <Button
                                      size="small"
                                      onClick={() => setDeleteConfirmId(null)}
                                      disabled={isMutatingItems}
                                    >
                                      Cancelar
                                    </Button>
                                  </Box>
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: 1.5,
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        noWrap
                                        sx={{ maxWidth: 240 }}
                                      >
                                        {item.description}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="primary.main"
                                        fontWeight={600}
                                        sx={{ whiteSpace: 'nowrap' }}
                                      >
                                        {formatCurrency(item.amount)}
                                      </Typography>
                                    </Box>
                                    {item.tags.length > 0 && (
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          gap: 0.5,
                                          flexWrap: 'wrap',
                                          mt: 0.5,
                                        }}
                                      >
                                        {item.tags.map(tag => (
                                          <Chip
                                            key={tag.id}
                                            label={tag.name}
                                            size="small"
                                            sx={{
                                              bgcolor: tag.color || '#9e9e9e',
                                              color: '#fff',
                                              height: 20,
                                              fontSize: '0.7rem',
                                            }}
                                          />
                                        ))}
                                      </Box>
                                    )}
                                  </Box>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      gap: 0.5,
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Tooltip title="Editar" arrow>
                                      <span>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            handleStartEditingItem(item)
                                          }
                                          disabled={isMutatingItems}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title="Excluir" arrow>
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            handleDeleteItem(item.id)
                                          }
                                          disabled={isMutatingItems}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              )}
                            </Paper>
                          </Fade>
                        );
                      })}

                      {/* Inline Add Form */}
                      <Collapse in={showAddForm}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderColor: 'primary.main',
                            borderStyle: 'dashed',
                            borderRadius: 2,
                          }}
                        >
                          <Grid container spacing={1.5} alignItems="flex-start">
                            <Grid item xs={12} sm={4}>
                              <TextField
                                value={newItemDescription}
                                onChange={e =>
                                  setNewItemDescription(e.target.value)
                                }
                                label="Descrição"
                                fullWidth
                                size="small"
                                autoFocus
                                placeholder="Ex: Produto A"
                                disabled={isMutatingItems || isSubmitting}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateItem();
                                  }
                                  if (e.key === 'Escape') {
                                    setShowAddForm(false);
                                  }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <CurrencyField
                                label="Valor"
                                value={newItemAmount || 0}
                                onChange={setNewItemAmount}
                                fullWidth
                                size="small"
                                disabled={isMutatingItems || isSubmitting}
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <Autocomplete
                                multiple
                                options={tags}
                                getOptionLabel={option => option.name}
                                value={tags.filter(tag =>
                                  newItemTagIds.includes(tag.id)
                                )}
                                onChange={(_, newValue) => {
                                  setNewItemTagIds(newValue.map(tag => tag.id));
                                }}
                                size="small"
                                disabled={isMutatingItems || isSubmitting}
                                renderInput={params => (
                                  <TextField
                                    {...params}
                                    label="Tags"
                                    placeholder="Selecione"
                                  />
                                )}
                              />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  gap: 0.5,
                                  mt: { xs: 0, sm: 0.5 },
                                }}
                              >
                                <Tooltip title="Salvar item" arrow>
                                  <span>
                                    <IconButton
                                      color="primary"
                                      size="small"
                                      onClick={handleCreateItem}
                                      disabled={
                                        !canCreateItem ||
                                        isMutatingItems ||
                                        isSubmitting
                                      }
                                    >
                                      <CheckIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Cancelar" arrow>
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setShowAddForm(false);
                                        setNewItemDescription('');
                                        setNewItemAmount(null);
                                        setNewItemTagIds([]);
                                      }}
                                      disabled={isMutatingItems || isSubmitting}
                                    >
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Collapse>

                      {installmentItems.length > 0 && !showAddForm && (
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          variant="text"
                          onClick={() => setShowAddForm(true)}
                          disabled={isMutatingItems}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Adicionar item
                        </Button>
                      )}
                    </Stack>
                  )}
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{ minWidth: 100 }}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <QuickCreateTag
        open={quickTagOpen}
        onClose={() => setQuickTagOpen(false)}
        onCreated={tag => {
          const currentTags = watch('tagIds') || [];
          setValue('tagIds', [...currentTags, tag.id]);
        }}
      />
    </>
  );
};
