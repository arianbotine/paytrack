import React, { useEffect, useMemo, useState } from 'react';
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
  Chip,
  Grid,
  Autocomplete,
  InputAdornment,
  Alert,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Switch,
  Typography,
  Paper,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  CalendarToday,
  AttachMoney,
  Numbers,
  SwapHoriz,
  Add as AddIcon,
  ContentCopy,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Payable, PayableFormData, Vendor, Category, Tag } from '../types';
import { payableSchema, getDefaultFormValues } from '../types';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import { getTodayLocalInput } from '../../../shared/utils/dateUtils';
import {
  generateInstallmentDueDates,
  calculateInstallmentAmounts,
} from '../../../shared/utils/installmentUtils';
import { CurrencyField } from '../../../shared/components';
import { QuickCreateCategory } from '../../../shared/components/QuickCreateCategory';
import { QuickCreateTag } from '../../../shared/components/QuickCreateTag';
import { InlinePaymentForm } from '../../../shared/components/InlinePaymentForm';
import {
  useLatestPayableAccount,
  useLatestPayableByCategory,
} from '../hooks/usePayables';

interface PayableFormDialogProps {
  open: boolean;
  payable: Payable | null;
  vendors: Vendor[];
  categories: Category[];
  tags: Tag[];
  isSubmitting: boolean;
  onSubmit: (data: PayableFormData) => void;
  onClose: () => void;
}

export const PayableFormDialog: React.FC<PayableFormDialogProps> = ({
  open,
  payable,
  vendors,
  categories,
  tags,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isEditing = !!payable;
  const [paymentFormValid, setPaymentFormValid] = useState(true);
  const [isInstallment, setIsInstallment] = useState(false);
  const [userInputValue, setUserInputValue] = useState<number | null>(null);
  const [userInputMode, setUserInputMode] = useState<
    'total' | 'perInstallment'
  >('total');
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const [quickTagOpen, setQuickTagOpen] = useState(false);
  const [copiedTagSourceKey, setCopiedTagSourceKey] = useState<string | null>(
    null
  );
  const [copiedAmountSourceKey, setCopiedAmountSourceKey] = useState<
    string | null
  >(null);
  const [categoryManuallyChanged, setCategoryManuallyChanged] = useState(false);
  const [categoryAutoApplied, setCategoryAutoApplied] = useState(false);

  // Helper function to determine grid size based on installment count
  const getGridSize = (installmentCount: number = 1) => {
    const count = installmentCount;
    if (count <= 3) return { xs: 12, sm: 12, md: 12 };
    if (count <= 6) return { xs: 12, sm: 6, md: 6 };
    return { xs: 12, sm: 6, md: 4 };
  };

  // Helper function to determine border color based on index
  const getBorderColor = (index: number, totalLength: number) => {
    if (index === 0) return 'primary.main';
    if (index === totalLength - 1) return 'success.main';
    return 'divider';
  };

  // Helper function to determine hover border color based on index
  const getHoverBorderColor = (index: number, totalLength: number) => {
    if (index === 0) return 'primary.dark';
    if (index === totalLength - 1) return 'success.dark';
    return 'primary.light';
  };

  // Helper function to determine chip color based on index
  const getChipColor = (index: number, totalLength: number) => {
    if (index === 0) return 'primary';
    if (index === totalLength - 1) return 'success';
    return 'default';
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PayableFormData>({
    resolver: zodResolver(payableSchema),
    defaultValues: getDefaultFormValues(),
  });

  // Watch para preview reativo
  const installmentCount = watch('installmentCount');
  const amount = watch('amount');
  const firstDueDate = watch('firstDueDate');
  const vendorId = watch('vendorId');
  const selectedCategoryId = watch('categoryId');
  const { data: latestPayable, isFetching: isFetchingLatestAccount } =
    useLatestPayableAccount(vendorId, open && !isEditing);
  const {
    data: latestCategoryAccount,
    isFetching: isFetchingLatestTags,
    isError: hasLatestTagsError,
  } = useLatestPayableByCategory(
    vendorId,
    selectedCategoryId,
    open && !isEditing
  );
  const latestTagIds = latestCategoryAccount?.tagIds ?? [];
  const currentTagSourceKey = `${vendorId ?? ''}:${selectedCategoryId ?? ''}`;

  useEffect(() => {
    if (!open || isEditing) return;

    setValue('categoryId', '');
    setCategoryManuallyChanged(false);
    setCategoryAutoApplied(false);
    setCopiedTagSourceKey(null);
    setCopiedAmountSourceKey(null);
  }, [vendorId, open, isEditing, setValue]);

  useEffect(() => {
    if (
      !open ||
      isEditing ||
      !vendorId ||
      isFetchingLatestAccount ||
      latestPayable === undefined ||
      categoryManuallyChanged
    ) {
      return;
    }

    const categoryId = latestPayable?.categoryId ?? '';
    setValue('categoryId', categoryId);

    if (!categoryId) return;

    setCategoryAutoApplied(true);
    const timeoutId = window.setTimeout(
      () => setCategoryAutoApplied(false),
      1800
    );
    return () => window.clearTimeout(timeoutId);
  }, [
    open,
    isEditing,
    vendorId,
    isFetchingLatestAccount,
    latestPayable,
    categoryManuallyChanged,
    setValue,
  ]);

  const copyLatestTags = () => {
    if (!vendorId || !selectedCategoryId || latestTagIds.length === 0) return;

    setValue('tagIds', latestTagIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setCopiedTagSourceKey(`${vendorId}:${selectedCategoryId}`);
  };

  const copyLatestAmount = () => {
    const latestAmount = latestCategoryAccount?.amount;
    if (!vendorId || !selectedCategoryId || latestAmount == null) return;

    setUserInputMode('total');
    setUserInputValue(latestAmount);
    setCopiedAmountSourceKey(currentTagSourceKey);
  };

  // Calcular valores baseado no modo de entrada do usuário
  useEffect(() => {
    if (userInputValue === null) return;

    if (userInputMode === 'total') {
      setValue('amount', userInputValue);
    } else if (isInstallment && installmentCount && installmentCount > 1) {
      setValue('amount', userInputValue * installmentCount);
    }
  }, [
    userInputMode,
    userInputValue,
    isInstallment,
    installmentCount,
    setValue,
  ]);

  // Gerar preview de parcelas (inclui parcela única para pagamento)
  const installmentPreview = useMemo(() => {
    if (!amount || amount <= 0) return [];
    if (!firstDueDate) return [];

    // Para parcela única (sem toggle de parcelamento ativado)
    if (!isInstallment || !installmentCount || installmentCount === 1) {
      return [
        {
          number: 1,
          dueDate: firstDueDate,
          amount: amount,
        },
      ];
    }

    // Para múltiplas parcelas
    try {
      const dueDates = generateInstallmentDueDates(
        firstDueDate,
        installmentCount
      );
      const amounts = calculateInstallmentAmounts(amount, installmentCount);

      return dueDates.map((dueDate, index) => ({
        number: index + 1,
        dueDate,
        amount: amounts[index],
      }));
    } catch {
      return [];
    }
  }, [isInstallment, installmentCount, amount, firstDueDate]);

  const currencyFieldHelperText = useMemo(() => {
    if (
      userInputMode === 'total' &&
      isInstallment &&
      userInputValue &&
      installmentCount &&
      installmentCount > 1
    ) {
      return `${installmentCount}x de ${formatCurrency(userInputValue / installmentCount)}`;
    } else if (
      userInputMode === 'perInstallment' &&
      isInstallment &&
      userInputValue &&
      installmentCount &&
      installmentCount > 1
    ) {
      return `Total: ${formatCurrency(userInputValue * installmentCount)} (${installmentCount}x)`;
    } else if (userInputMode === 'perInstallment') {
      return 'Digite o valor de cada parcela';
    } else {
      return undefined;
    }
  }, [userInputMode, isInstallment, userInputValue, installmentCount]);

  useEffect(() => {
    if (open) {
      setCopiedTagSourceKey(null);
      if (payable) {
        // Configurar estado de parcelamento baseado na conta existente
        const hasMultipleInstallments = payable.totalInstallments > 1;
        setIsInstallment(hasMultipleInstallments);

        reset({
          amount: payable.amount,
          firstDueDate:
            payable.nextUnpaidDueDate?.split('T')[0] || getTodayLocalInput(),
          vendorId: payable.vendor.id,
          categoryId: payable.category?.id || '',
          tagIds: payable.tags.map(t => t.tag.id),
          notes: payable.notes || '',
          installmentCount: payable.totalInstallments,
        });
        setUserInputValue(payable.amount);
        setUserInputMode('total');
      } else {
        reset(getDefaultFormValues());
        setUserInputValue(null);
        setUserInputMode('total');
        setIsInstallment(false);
      }
    }
  }, [open, payable, reset]);

  const handleClose = () => {
    reset();
    setIsInstallment(false);
    setUserInputValue(null);
    setUserInputMode('total');
    onClose();
  };

  const handleFormSubmit = (data: PayableFormData) => {
    if (isEditing) {
      // Ao editar, remover campos de parcelamento que não são permitidos no DTO
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { installmentCount, firstDueDate, dueDates, ...editData } = data;
      // Type assertion necessária pois o backend aceita campos parciais na edição
      onSubmit(editData as unknown as PayableFormData);
    } else {
      // Ao criar, enviar dueDates como array
      const dueDates = isInstallment
        ? installmentPreview.map(p => p.dueDate)
        : [data.firstDueDate];

      onSubmit({
        ...data,
        installmentCount: data.installmentCount || 1,
        dueDates,
      });
    }
  };

  let currencyFieldLabel;
  if (userInputMode === 'total') {
    currencyFieldLabel = isInstallment ? 'Valor Total' : 'Valor';
  } else {
    currencyFieldLabel = 'Valor por Parcela';
  }

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          key="payable-dialog"
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
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <DialogTitle>
              {isEditing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
            </DialogTitle>
            <DialogContent>
              {/* Aviso de conta com pagamentos - Movido para o início */}
              {payable && payable.paidAmount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Esta conta possui pagamentos no valor de{' '}
                  {formatCurrency(payable.paidAmount)}. Não é possível alterar o
                  valor total, parcelamento ou datas de vencimento. Para
                  visualizar o histórico completo, use o botão "Ver Pagamentos"
                  na lista de contas.
                </Alert>
              )}

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} tablet={4} md={6}>
                  <Controller
                    name="vendorId"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={vendors}
                        getOptionLabel={vendor => vendor.name}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        value={
                          vendors.find(vendor => vendor.id === field.value) ??
                          null
                        }
                        onChange={(_, vendor) =>
                          field.onChange(vendor?.id ?? '')
                        }
                        onBlur={field.onBlur}
                        noOptionsText="Nenhum credor encontrado"
                        renderInput={params => (
                          <TextField
                            {...params}
                            inputRef={field.ref}
                            label="Credor"
                            error={!!errors.vendorId}
                            helperText={errors.vendorId?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} tablet={4} md={6}>
                  <Box sx={{ position: 'relative' }}>
                    <Controller
                      name="categoryId"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Categoria</InputLabel>
                          <Select
                            {...field}
                            label="Categoria"
                            onChange={event => {
                              setCategoryManuallyChanged(true);
                              setCategoryAutoApplied(false);
                              setCopiedTagSourceKey(null);
                              setCopiedAmountSourceKey(null);
                              field.onChange(event);
                            }}
                            sx={{
                              transition: theme.transitions.create(
                                ['background-color'],
                                { duration: 250 }
                              ),
                              backgroundColor: categoryAutoApplied
                                ? 'action.selected'
                                : 'transparent',
                              '& .MuiOutlinedInput-notchedOutline': {
                                transition: theme.transitions.create(
                                  ['border-color'],
                                  { duration: 250 }
                                ),
                                borderColor: categoryAutoApplied
                                  ? 'success.main'
                                  : undefined,
                              },
                            }}
                          >
                            <MenuItem value="">Sem categoria</MenuItem>
                            {categories.map(category => (
                              <MenuItem key={category.id} value={category.id}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      backgroundColor:
                                        category.color || '#e0e0e0',
                                    }}
                                  />
                                  {category.name}
                                </Box>
                              </MenuItem>
                            ))}
                            <MenuItem
                              onClick={() => setQuickCategoryOpen(true)}
                              sx={{
                                borderTop: 1,
                                borderColor: 'divider',
                                color: 'primary.main',
                                fontWeight: 600,
                                '&:hover': {
                                  backgroundColor: 'primary.lighter',
                                },
                              }}
                            >
                              <AddIcon sx={{ mr: 1, fontSize: 20 }} />
                              Criar nova categoria
                            </MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Box>
                </Grid>

                {/* Campo de Valor - Com alternância fluida entre total e parcela */}
                <Grid item xs={12} tablet={4} md={6}>
                  <CurrencyField
                    label={currencyFieldLabel}
                    fullWidth
                    value={userInputValue}
                    onChange={value => {
                      setUserInputValue(value);
                      setCopiedAmountSourceKey(null);
                    }}
                    disabled={isEditing && payable?.paidAmount !== 0}
                    error={!!errors.amount}
                    helperText={currencyFieldHelperText}
                    InputProps={{
                      endAdornment: (isInstallment || !isEditing) && (
                        <InputAdornment position="end">
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.25}
                          >
                            {isInstallment && (
                              <Tooltip
                                title={`Alternar para valor ${userInputMode === 'total' ? 'por parcela' : 'total'}`}
                                arrow
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setUserInputMode(
                                      userInputMode === 'total'
                                        ? 'perInstallment'
                                        : 'total'
                                    );
                                  }}
                                  sx={{
                                    color: 'primary.main',
                                    '&:hover': {
                                      backgroundColor: 'primary.lighter',
                                    },
                                  }}
                                >
                                  <SwapHoriz />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!isEditing && (
                              <Tooltip
                                title={
                                  !vendorId
                                    ? 'Selecione um credor para buscar o valor'
                                    : !selectedCategoryId
                                      ? 'Selecione uma categoria para buscar o valor'
                                      : isFetchingLatestTags
                                        ? 'Buscando valor da última conta...'
                                        : hasLatestTagsError
                                          ? 'Não foi possível carregar o valor da última conta'
                                          : latestCategoryAccount === null
                                            ? 'Nenhuma conta anterior encontrada para esta categoria'
                                            : copiedAmountSourceKey ===
                                                currentTagSourceKey
                                              ? 'Valor da última conta copiado'
                                              : 'Copiar valor da última conta'
                                }
                                arrow
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={copyLatestAmount}
                                    disabled={
                                      !vendorId ||
                                      !selectedCategoryId ||
                                      isFetchingLatestTags ||
                                      hasLatestTagsError ||
                                      latestCategoryAccount?.amount == null
                                    }
                                    aria-label="Copiar valor da última conta deste credor e categoria"
                                    sx={{
                                      color:
                                        copiedAmountSourceKey ===
                                        currentTagSourceKey
                                          ? 'success.main'
                                          : 'primary.main',
                                    }}
                                  >
                                    {isFetchingLatestTags ? (
                                      <CircularProgress size={18} />
                                    ) : copiedAmountSourceKey ===
                                      currentTagSourceKey ? (
                                      <CheckIcon />
                                    ) : (
                                      <ContentCopy />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} tablet={4} md={6}>
                  <Controller
                    name="firstDueDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={
                          isInstallment
                            ? 'Vencimento da 1ª Parcela'
                            : 'Data de Vencimento'
                        }
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.firstDueDate}
                        helperText={errors.firstDueDate?.message}
                        disabled={isEditing}
                      />
                    )}
                  />
                </Grid>

                {/* Tags */}
                <Grid item xs={12} md={6}>
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
                          renderInput={params => (
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
                                  backgroundColor: option.color || '#e0e0e0',
                                  color: '#fff',
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
                    <Tooltip
                      title={
                        !vendorId
                          ? 'Selecione um credor para buscar tags'
                          : !selectedCategoryId
                            ? 'Selecione uma categoria para buscar tags'
                            : isFetchingLatestTags
                              ? 'Buscando tags da última conta...'
                              : hasLatestTagsError
                                ? 'Não foi possível carregar as tags da última conta'
                                : latestCategoryAccount === null
                                  ? 'Nenhuma conta anterior encontrada para esta categoria'
                                  : latestTagIds.length === 0
                                    ? 'A última conta desta categoria não possui tags'
                                    : copiedTagSourceKey === currentTagSourceKey
                                      ? 'Tags copiadas da última conta'
                                      : 'Copiar tags da última conta'
                      }
                      arrow
                    >
                      <span>
                        <IconButton
                          onClick={copyLatestTags}
                          disabled={
                            !vendorId ||
                            !selectedCategoryId ||
                            isFetchingLatestTags ||
                            hasLatestTagsError ||
                            latestCategoryAccount === null ||
                            latestCategoryAccount === undefined ||
                            latestTagIds.length === 0
                          }
                          aria-label="Copiar tags da última conta deste credor e categoria"
                          sx={{
                            mt: 0.5,
                            color:
                              copiedTagSourceKey === currentTagSourceKey
                                ? 'success.main'
                                : 'primary.main',
                          }}
                        >
                          {isFetchingLatestTags ? (
                            <CircularProgress size={20} />
                          ) : copiedTagSourceKey === currentTagSourceKey ? (
                            <CheckIcon />
                          ) : (
                            <ContentCopy />
                          )}
                        </IconButton>
                      </span>
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
                        fullWidth
                        multiline
                        rows={3}
                      />
                    )}
                  />
                </Grid>

                {/* Toggle de Parcelamento */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isInstallment}
                        onChange={e => {
                          setIsInstallment(e.target.checked);
                          if (e.target.checked) {
                            setValue('installmentCount', 2);
                          } else {
                            setValue('installmentCount', 1);
                          }
                        }}
                        disabled={isEditing}
                      />
                    }
                    label="Parcelar pagamento"
                  />
                </Grid>

                {/* Campos de Parcelamento */}
                {isInstallment && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="installmentCount"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Quantidade de Parcelas"
                            type="number"
                            fullWidth
                            InputProps={{
                              inputProps: { min: 2, max: 120 },
                            }}
                            error={!!errors.installmentCount}
                            helperText={errors.installmentCount?.message}
                            disabled={isEditing}
                          />
                        )}
                      />
                    </Grid>

                    {/* Preview de Parcelas */}
                    {installmentPreview.length > 0 && (
                      <Grid item xs={12}>
                        <Paper
                          elevation={0}
                          sx={{
                            mt: 1,
                            p: 2.5,
                            background: theme =>
                              `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.primary.main}03 100%)`,
                            border: 1,
                            borderColor: 'primary.light',
                            borderRadius: 2,
                          }}
                        >
                          <Stack spacing={2}>
                            {/* Cabeçalho com resumo */}
                            <Box>
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                color="primary"
                                gutterBottom
                              >
                                📋 Prévia do Parcelamento
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={3}
                                flexWrap="wrap"
                                sx={{ mt: 1.5 }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                >
                                  <Numbers fontSize="small" color="action" />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {installmentCount}x parcelas
                                  </Typography>
                                </Stack>
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                >
                                  <AttachMoney
                                    fontSize="small"
                                    color="action"
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Média:{' '}
                                    {formatCurrency(
                                      (() => {
                                        const amounts =
                                          calculateInstallmentAmounts(
                                            amount,
                                            installmentCount || 1
                                          );
                                        return (
                                          amounts.reduce(
                                            (sum, val) => sum + val,
                                            0
                                          ) / amounts.length
                                        );
                                      })()
                                    )}
                                  </Typography>
                                </Stack>
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                >
                                  <CalendarToday
                                    fontSize="small"
                                    color="action"
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {format(
                                      new Date(
                                        installmentPreview[0].dueDate +
                                          'T12:00:00'
                                      ),
                                      'dd/MM/yyyy'
                                    )}
                                    {' → '}
                                    {format(
                                      new Date(
                                        installmentPreview[
                                          installmentPreview.length - 1
                                        ].dueDate + 'T12:00:00'
                                      ),
                                      'dd/MM/yyyy'
                                    )}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Box>

                            <Divider />

                            {/* Lista de parcelas com scroll suave */}
                            <Box
                              sx={{
                                maxHeight:
                                  (installmentCount || 1) <= 6 ? 'auto' : 340,
                                overflow: 'auto',
                                pr: 0.5,
                                '&::-webkit-scrollbar': {
                                  width: '8px',
                                },
                                '&::-webkit-scrollbar-track': {
                                  background: 'rgba(0,0,0,0.05)',
                                  borderRadius: '4px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                  background: 'rgba(0,0,0,0.2)',
                                  borderRadius: '4px',
                                  '&:hover': {
                                    background: 'rgba(0,0,0,0.3)',
                                  },
                                },
                              }}
                            >
                              <Grid container spacing={1.5}>
                                {installmentPreview.map((preview, index) => {
                                  const gridSize =
                                    getGridSize(installmentCount);
                                  return (
                                    <Grid
                                      item
                                      xs={gridSize.xs}
                                      sm={gridSize.sm}
                                      md={gridSize.md}
                                      key={preview.number}
                                    >
                                      <Paper
                                        elevation={0}
                                        sx={{
                                          p: 1.5,
                                          border: 1,
                                          borderColor: getBorderColor(
                                            index,
                                            installmentPreview.length
                                          ),
                                          borderRadius: 1.5,
                                          backgroundColor: 'background.paper',
                                          transition: 'all 0.2s ease-in-out',
                                          '&:hover': {
                                            boxShadow: 2,
                                            transform: 'translateY(-2px)',
                                            borderColor: getHoverBorderColor(
                                              index,
                                              installmentPreview.length
                                            ),
                                          },
                                        }}
                                      >
                                        <Stack spacing={0.5}>
                                          <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                          >
                                            <Chip
                                              label={`${preview.number}/${installmentCount}`}
                                              size="small"
                                              color={getChipColor(
                                                index,
                                                installmentPreview.length
                                              )}
                                              sx={{
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                              }}
                                            />
                                            <Typography
                                              variant="subtitle2"
                                              fontWeight={700}
                                              color="primary.main"
                                            >
                                              {formatCurrency(preview.amount)}
                                            </Typography>
                                          </Stack>
                                          <Stack
                                            direction="row"
                                            spacing={0.5}
                                            alignItems="center"
                                          >
                                            <CalendarToday
                                              sx={{
                                                fontSize: 14,
                                                color: 'text.secondary',
                                              }}
                                            />
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                            >
                                              {format(
                                                new Date(
                                                  preview.dueDate + 'T12:00:00'
                                                ),
                                                "dd 'de' MMMM 'de' yyyy",
                                                { locale: ptBR }
                                              )}
                                            </Typography>
                                          </Stack>
                                        </Stack>
                                      </Paper>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>
                    )}
                  </>
                )}

                {/* Formulário de Pagamento Opcional - Disponível para parcela única e parcelado */}
                {!isEditing && installmentPreview.length > 0 && (
                  <Grid item xs={12}>
                    <InlinePaymentForm
                      control={control}
                      watch={watch}
                      errors={errors}
                      installmentPreview={installmentPreview}
                      accountType="payable"
                      onValidationChange={setPaymentFormValid}
                    />
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || !paymentFormValid}
                startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
              >
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      <QuickCreateCategory
        key="quick-create-category"
        open={quickCategoryOpen}
        type="PAYABLE"
        onClose={() => setQuickCategoryOpen(false)}
        onCreated={category => {
          setValue('categoryId', category.id);
        }}
      />

      <QuickCreateTag
        key="quick-create-tag"
        open={quickTagOpen}
        onClose={() => setQuickTagOpen(false)}
        onCreated={tag => {
          const currentTags = watch('tagIds') || [];
          setValue('tagIds', [...currentTags, tag.id]);
        }}
      />
    </AnimatePresence>
  );
};
