import { useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays } from 'date-fns';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { CurrencyField } from './CurrencyField';
import { generateInstallmentDueDates } from '../utils/installmentUtils';
import { formatLocalDate } from '../utils/dateUtils';

const appendInstallmentsSchema = z
  .object({
    amountCents: z.number().int().min(1, 'Informe um valor maior que zero'),
    installmentCount: z.number().int().min(1).max(120),
    firstDueDate: z.string().min(1, 'Informe o vencimento da primeira parcela'),
  })
  .refine(data => data.amountCents >= data.installmentCount, {
    path: ['amountCents'],
    message: 'O valor precisa gerar pelo menos R$ 0,01 em cada parcela',
  });

type AppendInstallmentsForm = z.infer<typeof appendInstallmentsSchema>;

export interface AppendInstallmentsPayload {
  amountCents: number;
  installmentCount: number;
  dueDates: string[];
}

interface AppendInstallmentsDialogProps {
  open: boolean;
  accountType: 'payable' | 'receivable';
  accountName: string;
  currentAmount: number;
  currentInstallmentCount: number;
  lastDueDate: string | null;
  maxInstallmentCount: number;
  isSubmitting: boolean;
  onSubmit: (data: AppendInstallmentsPayload) => void;
  onClose: () => void;
}

const formatCents = (cents: number): string => {
  const wholeUnits = Math.floor(cents / 100);
  const fractionalUnits = String(cents % 100).padStart(2, '0');
  const formattedWholeUnits = new Intl.NumberFormat('pt-BR').format(wholeUnits);
  return `R$ ${formattedWholeUnits},${fractionalUnits}`;
};

export const AppendInstallmentsDialog: React.FC<
  AppendInstallmentsDialogProps
> = ({
  open,
  accountType,
  accountName,
  currentAmount,
  currentInstallmentCount,
  lastDueDate,
  maxInstallmentCount,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const lastDueDateInput = lastDueDate?.slice(0, 10) || null;
  const minimumDueDate = lastDueDateInput
    ? addDays(new Date(`${lastDueDateInput}T12:00:00.000Z`), 1)
        .toISOString()
        .slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const defaultFirstDueDate = lastDueDateInput
    ? generateInstallmentDueDates(lastDueDateInput, 2)[1]
    : minimumDueDate;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AppendInstallmentsForm>({
    resolver: zodResolver(appendInstallmentsSchema),
    defaultValues: {
      amountCents: 0,
      installmentCount: 1,
      firstDueDate: defaultFirstDueDate,
    },
  });
  const amountCents = useWatch({ control, name: 'amountCents' }) || 0;
  const installmentCount = useWatch({ control, name: 'installmentCount' }) || 1;
  const firstDueDate = useWatch({ control, name: 'firstDueDate' }) || '';

  useEffect(() => {
    if (open) {
      reset({
        amountCents: 0,
        installmentCount: 1,
        firstDueDate: defaultFirstDueDate,
      });
    }
  }, [defaultFirstDueDate, open, reset]);

  const preview = useMemo(() => {
    if (
      !amountCents ||
      !installmentCount ||
      amountCents < installmentCount ||
      !firstDueDate ||
      installmentCount > maxInstallmentCount
    ) {
      return [];
    }

    const dueDates = generateInstallmentDueDates(
      firstDueDate,
      installmentCount
    );
    const baseCents = Math.floor(amountCents / installmentCount);
    const remainderCents = amountCents % installmentCount;

    return dueDates.map((dueDate, index) => ({
      number: currentInstallmentCount + index + 1,
      dueDate,
      amountCents:
        index === installmentCount - 1 ? baseCents + remainderCents : baseCents,
    }));
  }, [
    amountCents,
    currentInstallmentCount,
    firstDueDate,
    installmentCount,
    maxInstallmentCount,
  ]);

  const submit = (data: AppendInstallmentsForm) => {
    onSubmit({
      amountCents: data.amountCents,
      installmentCount: data.installmentCount,
      dueDates: generateInstallmentDueDates(
        data.firstDueDate,
        data.installmentCount
      ),
    });
  };

  const amountFieldLabel =
    accountType === 'payable'
      ? 'Valor adicional a pagar'
      : 'Valor adicional a receber';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="sm"
      aria-labelledby="append-installments-title"
    >
      <DialogTitle id="append-installments-title" sx={{ pr: 7 }}>
        Adicionar parcelas
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="body2" color="text.secondary" noWrap>
          {accountName}
        </Typography>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(submit)}>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info">
              O valor informado será somado ao total atual de{' '}
              {formatCents(Math.round(currentAmount * 100))}.
            </Alert>

            <Controller
              name="amountCents"
              control={control}
              render={({ field }) => (
                <CurrencyField
                  label={amountFieldLabel}
                  value={field.value ? field.value / 100 : null}
                  onChange={value =>
                    field.onChange(value === null ? 0 : Math.round(value * 100))
                  }
                  error={!!errors.amountCents}
                  helperText={errors.amountCents?.message}
                  fullWidth
                  autoFocus={!isMobile}
                  disabled={isSubmitting}
                />
              )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="installmentCount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Quantidade de parcelas"
                    type="number"
                    inputProps={{ min: 1, max: maxInstallmentCount, step: 1 }}
                    onChange={event =>
                      field.onChange(
                        Number.parseInt(event.target.value, 10) || 0
                      )
                    }
                    error={!!errors.installmentCount || maxInstallmentCount < 1}
                    helperText={
                      maxInstallmentCount < 1
                        ? 'A conta já atingiu o limite de parcelas'
                        : errors.installmentCount?.message ||
                          `Máximo de ${maxInstallmentCount} novas parcelas`
                    }
                    fullWidth
                    disabled={isSubmitting || maxInstallmentCount < 1}
                  />
                )}
              />
              <Controller
                name="firstDueDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Vencimento da primeira parcela"
                    type="date"
                    inputProps={{ min: minimumDueDate }}
                    error={!!errors.firstDueDate}
                    helperText={errors.firstDueDate?.message}
                    fullWidth
                    disabled={isSubmitting}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Stack>

            {preview.length > 0 && (
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">
                    Prévia das parcelas
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Novo total:{' '}
                    {formatCents(Math.round(currentAmount * 100) + amountCents)}
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <Table size="small" aria-label="Prévia das novas parcelas">
                  <TableHead>
                    <TableRow>
                      <TableCell>Parcela</TableCell>
                      <TableCell>Vencimento</TableCell>
                      <TableCell align="right">Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map(installment => (
                      <TableRow
                        key={`${installment.number}-${installment.dueDate}`}
                      >
                        <TableCell>{installment.number}</TableCell>
                        <TableCell>
                          {formatLocalDate(installment.dueDate)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCents(installment.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              isSubmitting ||
              maxInstallmentCount < 1 ||
              installmentCount > maxInstallmentCount
            }
          >
            {isSubmitting ? 'Adicionando...' : 'Confirmar parcelas'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
