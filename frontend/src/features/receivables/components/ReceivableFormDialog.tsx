import React, { useEffect, useState, useMemo } from 'react';
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
  FormHelperText,
  useMediaQuery,
  useTheme,
  Alert,
  Switch,
  FormControlLabel,
  Typography,
  Paper,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CalendarToday,
  AttachMoney,
  Numbers,
  SwapHoriz,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  Receivable,
  ReceivableFormData,
  Customer,
  Category,
  Tag,
} from '../types';
import { receivableSchema, getDefaultFormValues } from '../types';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import {
  generateInstallmentDueDates,
  calculateInstallmentAmounts,
} from '../../../shared/utils/installmentUtils';

interface ReceivableFormDialogProps {
  open: boolean;
  receivable: Receivable | null;
  customers: Customer[];
  categories: Category[];
  tags: Tag[];
  isSubmitting: boolean;
  onSubmit: (data: ReceivableFormData) => void;
  onClose: () => void;
}

export const ReceivableFormDialog: React.FC<ReceivableFormDialogProps> = ({
  open,
  receivable,
  customers,
  categories,
  tags,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isEditing = !!receivable;

  const [isInstallment, setIsInstallment] = useState(false);
  const [calculationMode, setCalculationMode] = useState<
    'total' | 'perInstallment'
  >('total');
  const [installmentValue, setInstallmentValue] = useState<number>(0);

  // Helper function to determine grid size based on installment count
  const getGridSize = (installmentCount: number = 1) => {
    if (installmentCount <= 3) return { xs: 12, sm: 12, md: 12 };
    if (installmentCount <= 6) return { xs: 12, sm: 6, md: 6 };
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

  // Helper function to determine chip color for installments
  const getInstallmentChipColor = (index: number, total: number) => {
    if (index === 0) return 'primary';
    if (index === total - 1) return 'success';
    return 'default';
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReceivableFormData>({
    resolver: zodResolver(receivableSchema),
    defaultValues: getDefaultFormValues(),
  });

  // Watch values for installment preview
  const amount = watch('amount');
  const installmentCount = watch('installmentCount') || 1;
  const firstDueDate = watch('firstDueDate');

  // Calcular valor total quando modo for 'por parcela'
  useEffect(() => {
    if (
      calculationMode === 'perInstallment' &&
      installmentValue > 0 &&
      installmentCount > 1
    ) {
      const total = installmentValue * installmentCount;
      setValue('amount', total);
    }
  }, [calculationMode, installmentValue, installmentCount, setValue]);

  // Calculate installment preview
  const installmentPreview = useMemo(() => {
    if (!isInstallment || installmentCount <= 1 || !amount || !firstDueDate) {
      return [];
    }

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
  }, [isInstallment, amount, installmentCount, firstDueDate]);

  useEffect(() => {
    if (open) {
      if (receivable) {
        reset({
          description: receivable.description,
          amount: receivable.amount,
          dueDate: receivable.dueDate.split('T')[0], // Extrai apenas YYYY-MM-DD
          customerId: receivable.customer.id,
          categoryId: receivable.category?.id || '',
          tagIds: receivable.tags.map(t => t.tag.id),
          notes: receivable.notes || '',
          invoiceNumber: receivable.invoiceNumber || '',
        });
      } else {
        reset(getDefaultFormValues());
      }
    }
  }, [open, receivable, reset]);

  const handleClose = () => {
    reset();
    setIsInstallment(false);
    setCalculationMode('total');
    setInstallmentValue(0);
    onClose();
  };

  const handleFormSubmit = (data: ReceivableFormData) => {
    if (isInstallment && !isEditing) {
      // Para parcelamentos, enviar as datas calculadas
      const dueDates = installmentPreview.map(p => p.dueDate);
      onSubmit({
        ...data,
        installmentCount: data.installmentCount,
        dueDates,
      });
    } else {
      // Para contas simples ou edição, remover firstDueDate e enviar normalmente
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { firstDueDate: _firstDueDate, ...submitData } = data;
      onSubmit(submitData);
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
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <DialogTitle>
              {isEditing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
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
                        autoFocus
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
                          {customers.map(customer => (
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
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Campo de Valor - Com alternância fluida entre total e parcela */}
                <Grid item xs={12} md={6}>
                  {calculationMode === 'total' || !isInstallment ? (
                    <Controller
                      name="amount"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={isInstallment ? 'Valor Total' : 'Valor'}
                          type="number"
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                R$
                              </InputAdornment>
                            ),
                            endAdornment: isInstallment && (
                              <InputAdornment position="end">
                                <Tooltip
                                  title="Alternar para valor por parcela"
                                  arrow
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const currentTotal = field.value || 0;
                                      if (
                                        currentTotal > 0 &&
                                        installmentCount > 1
                                      ) {
                                        setInstallmentValue(
                                          currentTotal / installmentCount
                                        );
                                      }
                                      setCalculationMode('perInstallment');
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
                              </InputAdornment>
                            ),
                          }}
                          error={!!errors.amount}
                          helperText={
                            errors.amount?.message ||
                            (isInstallment &&
                            field.value > 0 &&
                            installmentCount > 1
                              ? `${installmentCount}x de ${formatCurrency(field.value / installmentCount)}`
                              : undefined)
                          }
                        />
                      )}
                    />
                  ) : (
                    <TextField
                      label="Valor por Parcela"
                      type="number"
                      fullWidth
                      value={installmentValue || ''}
                      onChange={e =>
                        setInstallmentValue(Number(e.target.value))
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">R$</InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Alternar para valor total" arrow>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCalculationMode('total');
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
                          </InputAdornment>
                        ),
                      }}
                      helperText={
                        installmentValue > 0 && installmentCount > 1
                          ? `Total: ${formatCurrency(installmentValue * installmentCount)} (${installmentCount}x)`
                          : 'Digite o valor de cada parcela'
                      }
                    />
                  )}
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
                        disabled={isInstallment}
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
                    label="Parcelar recebimento"
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

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="firstDueDate"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Vencimento da 1ª Parcela"
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
                                    {formatCurrency(amount / installmentCount)}
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
                                maxHeight: installmentCount <= 6 ? 'auto' : 340,
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
                                              color={getInstallmentChipColor(
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

              {receivable && receivable.receivedAmount > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Esta conta possui recebimentos registrados no valor de{' '}
                  {formatCurrency(receivable.receivedAmount)}. Para visualizar o
                  histórico completo, use o botão "Ver Pagamentos" na lista de
                  contas.
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
