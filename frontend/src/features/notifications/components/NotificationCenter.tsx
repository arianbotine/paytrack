import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Notifications as NotificationsIcon,
  Payments as PayableIcon,
  RequestQuote as ReceivableIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatLocalDate } from '@/shared/utils/dateUtils';
import { formatCurrency } from '@/shared/utils/currencyUtils';
import {
  getOrganizationStorage,
  setOrganizationStorage,
} from '@/shared/utils/organization-storage';
import { useAuthStore } from '@/lib/stores/authStore';
import { QuickPaymentDialog } from '@/features/payments/components';
import { usePaymentOperations } from '@/features/payments/hooks/usePayments';
import type { PaymentFormData } from '@/features/payments/types';
import type { PayableInstallment } from '@/features/payables/types';
import type { ReceivableInstallment } from '@/features/receivables/types';
import { useDueAlerts } from '../hooks/useDueAlerts';
import type { DueAlertItem } from '../types';

const DISMISSED_STORAGE_KEY = 'notifications:dismissed';

const getTagChipStyles = (
  color: string | null | undefined
): Record<string, unknown> => {
  if (!color) {
    return {
      bgcolor: 'action.hover',
      color: 'text.secondary',
      borderColor: 'divider',
    };
  }

  return {
    bgcolor: alpha(color, 0.14),
    color,
    borderColor: alpha(color, 0.34),
  };
};

export function NotificationCenter() {
  const navigate = useNavigate();
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );
  const { data: alerts, isLoading } = useDueAlerts(100);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<DueAlertItem | null>(null);
  const [quickPaymentDialogOpen, setQuickPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    const stored = getOrganizationStorage<string[]>(
      organizationId,
      DISMISSED_STORAGE_KEY
    );
    setDismissedIds(stored || []);
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    setOrganizationStorage(organizationId, DISMISSED_STORAGE_KEY, dismissedIds);
  }, [organizationId, dismissedIds]);

  const { createMutation } = usePaymentOperations({
    onCreateSuccess: () => {
      setQuickPaymentDialogOpen(false);
      setSelectedAlert(null);
    },
  });

  const visibleAlerts = useMemo(
    () =>
      (alerts || []).filter(
        item => !dismissedIds.includes(item.notificationId)
      ),
    [alerts, dismissedIds]
  );

  const overdueAlerts = useMemo(
    () => visibleAlerts.filter(item => item.isOverdue),
    [visibleAlerts]
  );

  const upcomingAlerts = useMemo(
    () => visibleAlerts.filter(item => !item.isOverdue),
    [visibleAlerts]
  );

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDismiss = (notificationId: string) => {
    setDismissedIds(prev => [...prev, notificationId]);
  };

  const handleOpenQuickPayment = (alert: DueAlertItem) => {
    setSelectedAlert(alert);
    setQuickPaymentDialogOpen(true);
  };

  const handleQuickPaymentSubmit = (data: PaymentFormData) => {
    createMutation.mutate(data);
  };

  const handleViewAccount = (alert: DueAlertItem) => {
    handleClose();
    navigate(alert.accountType === 'PAYABLE' ? '/payables' : '/receivables');
  };

  const open = Boolean(anchorEl);

  const selectedInstallment = useMemo(() => {
    if (!selectedAlert) return null;

    if (selectedAlert.accountType === 'PAYABLE') {
      const payableInstallment: PayableInstallment = {
        id: selectedAlert.installmentId,
        installmentNumber: selectedAlert.installmentNumber,
        totalInstallments: selectedAlert.totalInstallments,
        amount: selectedAlert.amount,
        paidAmount: selectedAlert.paidAmount || 0,
        dueDate: selectedAlert.dueDate,
        status: selectedAlert.status,
        payable: {
          id: selectedAlert.accountId,
          vendor: {
            id: selectedAlert.accountId,
            name: selectedAlert.counterpartyName,
          },
        },
      };

      return payableInstallment;
    }

    const receivableInstallment: ReceivableInstallment = {
      id: selectedAlert.installmentId,
      installmentNumber: selectedAlert.installmentNumber,
      totalInstallments: selectedAlert.totalInstallments,
      amount: selectedAlert.amount,
      receivedAmount: selectedAlert.receivedAmount || 0,
      dueDate: selectedAlert.dueDate,
      status: selectedAlert.status,
      receivable: {
        id: selectedAlert.accountId,
        customer: {
          id: selectedAlert.accountId,
          name: selectedAlert.counterpartyName,
        },
      },
    };

    return receivableInstallment;
  }, [selectedAlert]);

  const renderAlertItem = (alert: DueAlertItem) => (
    <ListItem
      key={alert.notificationId}
      alignItems="flex-start"
      sx={{
        border: 1,
        borderColor: alert.isOverdue ? 'error.light' : 'warning.light',
        borderRadius: 1.5,
        mb: 1,
        bgcolor: alert.isOverdue ? 'error.50' : 'warning.50',
        pr: 10,
      }}
      secondaryAction={
        <Button
          size="small"
          color="inherit"
          onClick={() => handleDismiss(alert.notificationId)}
        >
          Dispensar
        </Button>
      }
    >
      <ListItemText
        primary={
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              {alert.accountType === 'PAYABLE' ? (
                <PayableIcon fontSize="small" color="error" />
              ) : (
                <ReceivableIcon fontSize="small" color="success" />
              )}
              <Typography variant="body2" fontWeight={700}>
                {alert.counterpartyName}
              </Typography>
              <Chip
                label={alert.isOverdue ? 'Vencida' : 'A vencer'}
                size="small"
                color={alert.isOverdue ? 'error' : 'warning'}
                variant="outlined"
                sx={{
                  height: 22,
                  '& .MuiChip-label': { px: 1, fontWeight: 600 },
                }}
              />
            </Stack>

            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                variant="outlined"
                label={
                  alert.accountType === 'PAYABLE'
                    ? 'Conta a pagar'
                    : 'Conta a receber'
                }
                sx={{
                  height: 20,
                  bgcolor: 'background.paper',
                  '& .MuiChip-label': { px: 0.9, fontSize: '0.7rem' },
                }}
              />
              {alert.categoryName && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Categoria: ${alert.categoryName}`}
                  sx={{
                    height: 20,
                    bgcolor: 'background.paper',
                    '& .MuiChip-label': { px: 0.9, fontSize: '0.7rem' },
                  }}
                />
              )}
              {alert.tags.slice(0, 3).map(tag => (
                <Chip
                  key={tag.id}
                  size="small"
                  variant="outlined"
                  label={tag.name}
                  sx={{
                    height: 20,
                    '& .MuiChip-label': { px: 0.9, fontSize: '0.7rem' },
                    ...getTagChipStyles(tag.color),
                  }}
                />
              ))}
              {alert.tags.length > 3 && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`+${alert.tags.length - 3}`}
                  sx={{
                    height: 20,
                    bgcolor: 'background.paper',
                    '& .MuiChip-label': { px: 0.9, fontSize: '0.7rem' },
                  }}
                />
              )}
            </Stack>
          </Stack>
        }
        secondary={
          <Box sx={{ mt: 0.75 }}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              Vencimento: {formatLocalDate(alert.dueDate)}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              Valor pendente: {formatCurrency(alert.pendingAmount)}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="contained"
                color={alert.accountType === 'PAYABLE' ? 'error' : 'success'}
                onClick={() => handleOpenQuickPayment(alert)}
              >
                Registrar
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleViewAccount(alert)}
              >
                Ver conta
              </Button>
            </Stack>
          </Box>
        }
      />
    </ListItem>
  );

  return (
    <>
      <Tooltip title="Notificações de vencimento">
        <IconButton onClick={handleOpen} color="inherit" sx={{ mr: 1 }}>
          <Badge badgeContent={visibleAlerts.length} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ width: 440, maxWidth: '92vw', p: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Alertas de vencimento
          </Typography>

          {isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Carregando notificações...
            </Typography>
          ) : visibleAlerts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum alerta ativo.
            </Typography>
          ) : (
            <>
              {overdueAlerts.length > 0 && (
                <>
                  <Typography
                    variant="subtitle2"
                    color="error.main"
                    sx={{ mt: 1, mb: 1 }}
                  >
                    Vencidas ({overdueAlerts.length})
                  </Typography>
                  <List dense disablePadding>
                    {overdueAlerts.map(renderAlertItem)}
                  </List>
                </>
              )}

              {upcomingAlerts.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography
                    variant="subtitle2"
                    color="warning.dark"
                    sx={{ mt: 1, mb: 1 }}
                  >
                    Próximas ({upcomingAlerts.length})
                  </Typography>
                  <List dense disablePadding>
                    {upcomingAlerts.map(renderAlertItem)}
                  </List>
                </>
              )}
            </>
          )}
        </Paper>
      </Popover>

      <QuickPaymentDialog
        open={quickPaymentDialogOpen}
        installment={selectedInstallment}
        type={
          selectedAlert?.accountType === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE'
        }
        isSubmitting={createMutation.isPending}
        onSubmit={handleQuickPaymentSubmit}
        onClose={() => {
          setQuickPaymentDialogOpen(false);
          setSelectedAlert(null);
        }}
      />
    </>
  );
}
