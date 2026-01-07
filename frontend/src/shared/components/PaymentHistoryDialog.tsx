import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { PaymentHistoryTimeline } from './PaymentHistoryTimeline';
import { formatCurrency } from '../utils/currencyUtils';
import type { PaymentHistoryItem } from '../../features/payments/types';

interface PaymentHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  accountType: 'payable' | 'receivable';
  accountData: {
    id: string;
    amount: number;
    paidAmount: number;
    dueDate: string;
    entityName: string; // vendor or debtor name
    status: string;
  } | null;
  payments: PaymentHistoryItem[];
  isLoading?: boolean;
}

export const PaymentHistoryDialog = ({
  open,
  onClose,
  accountType,
  accountData,
  payments,
  isLoading = false,
}: PaymentHistoryDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  if (!accountData) return null;

  const isPaid = accountData.paidAmount >= accountData.amount;
  const pendingAmount = accountData.amount - accountData.paidAmount;

  const getStatusColor = () => {
    if (isPaid) return 'success';
    if (accountData.paidAmount > 0) return 'warning';
    return 'default';
  };

  const getStatusLabel = () => {
    if (isPaid) return accountType === 'payable' ? 'Pago' : 'Recebido';
    if (accountData.paidAmount > 0) return 'Parcial';
    return 'Pendente';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 2,
        },
      }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {accountType === 'payable' ? 'Pagamentos' : 'Recebimentos'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {accountData.entityName}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ mt: -0.5, mr: -0.5 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Account Summary Card */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusLabel()}
                  color={getStatusColor()}
                  size="small"
                />
              </Stack>

              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Valor Total
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {formatCurrency(accountData.amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {accountType === 'payable' ? 'Pago' : 'Recebido'}
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color="success.main"
                  >
                    {formatCurrency(accountData.paidAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pendente
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color="warning.main"
                  >
                    {formatCurrency(pendingAmount)}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>

          {/* Payment Timeline */}
          <PaymentHistoryTimeline
            accountType={accountType}
            totalAmount={accountData.amount}
            paidAmount={accountData.paidAmount}
            payments={payments}
            isLoading={isLoading}
            entityName={accountData.entityName}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};
