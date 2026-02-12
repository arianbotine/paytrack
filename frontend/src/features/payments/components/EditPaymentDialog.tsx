import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs, { Dayjs } from 'dayjs';
import { PAYMENT_METHODS, Payment } from '../types';
import { useUpdatePayment } from '../hooks/usePayments';
import { toLocalDatetimeInput } from '../../../shared/utils/dateUtils';

const updatePaymentSchema = z.object({
  paymentDate: z.string().min(1, 'Data de registro é obrigatória'),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type UpdatePaymentFormData = z.infer<typeof updatePaymentSchema>;

interface EditPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export const EditPaymentDialog: React.FC<EditPaymentDialogProps> = ({
  open,
  onClose,
  payment,
}) => {
  const updateMutation = useUpdatePayment(onClose);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePaymentFormData>({
    resolver: zodResolver(updatePaymentSchema),
    defaultValues: {
      paymentDate: '',
      paymentMethod: '',
      reference: '',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (payment && open) {
      reset({
        paymentDate: toLocalDatetimeInput(payment.paymentDate),
        paymentMethod: payment.method || '',
        reference: payment.reference || '',
        notes: payment.notes || '',
      });
    }
  }, [payment, open, reset]);

  const onSubmit = (data: UpdatePaymentFormData) => {
    if (!payment) return;

    updateMutation.mutate({
      id: payment.id,
      data: {
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        notes: data.notes,
      },
    });
  };

  const handleClose = () => {
    if (!updateMutation.isPending) {
      reset();
      onClose();
    }
  };

  if (!payment) return null;

  const isPayable = !!payment.allocations[0]?.payableInstallment;
  const allocation = payment.allocations[0];
  const entityName = isPayable
    ? allocation?.payableInstallment?.payable?.vendor.name
    : allocation?.receivableInstallment?.receivable?.customer.name;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Pagamento</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {isPayable ? 'Pagamento para' : 'Recebimento de'}:{' '}
            <strong>{entityName}</strong>
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          <Controller
            name="paymentDate"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Data de Registro *"
                value={field.value ? dayjs(field.value) : null}
                onChange={(newValue: Dayjs | null) => {
                  field.onChange(
                    newValue ? newValue.format('YYYY-MM-DDTHH:mm') : ''
                  );
                }}
                format="DD/MM/YYYY HH:mm"
                ampm={false}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.paymentDate,
                    helperText: errors.paymentDate?.message,
                  },
                }}
              />
            )}
          />

          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Forma de Pagamento"
                fullWidth
                error={!!errors.paymentMethod}
                helperText={errors.paymentMethod?.message}
              >
                {PAYMENT_METHODS.map(method => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="reference"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Referência"
                placeholder="Ex: Comprovante PIX 123456"
                fullWidth
                error={!!errors.reference}
                helperText={errors.reference?.message}
              />
            )}
          />

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
                error={!!errors.notes}
                helperText={errors.notes?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={updateMutation.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={updateMutation.isPending}
          startIcon={
            updateMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : null
          }
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
