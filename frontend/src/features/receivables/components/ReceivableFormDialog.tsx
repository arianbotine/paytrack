import React, { useEffect } from 'react';
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
  FormHelperText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Receivable,
  ReceivableFormData,
  Customer,
  Category,
  Tag,
} from '../types';
import {
  receivableSchema,
  getDefaultFormValues,
  formatCurrency,
} from '../types';

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

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceivableFormData>({
    resolver: zodResolver(receivableSchema),
    defaultValues: getDefaultFormValues(),
  });

  useEffect(() => {
    if (open) {
      if (receivable) {
        reset({
          description: receivable.description,
          amount: receivable.amount,
          dueDate: format(parseISO(receivable.dueDate), 'yyyy-MM-dd'),
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
    onClose();
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
                  Esta conta já possui recebimentos registrados no valor de{' '}
                  {formatCurrency(receivable.receivedAmount)}.
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
