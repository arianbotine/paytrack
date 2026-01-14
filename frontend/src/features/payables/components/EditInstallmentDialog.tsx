import React, { useState } from 'react';
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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PayableInstallment, Payable, Tag } from '../types';
import { CurrencyField } from '../../../shared/components';
import { QuickCreateTag } from '../../../shared/components/QuickCreateTag';
import { toLocalDateInput } from '../../../shared/utils/dateUtils';

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
  onSubmit: (data: EditInstallmentFormData) => void;
  onClose: () => void;
}

export const EditInstallmentDialog: React.FC<EditInstallmentDialogProps> = ({
  open,
  installment,
  payable,
  tags,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [quickTagOpen, setQuickTagOpen] = useState(false);

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
  }, [installment, reset]);

  const handleFormSubmit = (data: EditInstallmentFormData) => {
    onSubmit(data);
  };

  if (!installment || !payable) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
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
