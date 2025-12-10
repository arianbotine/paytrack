import { Chip, ChipProps } from '@mui/material';

type AccountStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type AccountType = 'payable' | 'receivable';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: AccountStatus;
  type?: AccountType;
}

const statusConfig: Record<
  AccountStatus,
  { label: string; labelReceivable: string; color: ChipProps['color'] }
> = {
  PENDING: { label: 'Pendente', labelReceivable: 'Pendente', color: 'warning' },
  PARTIAL: { label: 'Parcial', labelReceivable: 'Parcial', color: 'info' },
  PAID: { label: 'Pago', labelReceivable: 'Recebido', color: 'success' },
  OVERDUE: { label: 'Vencido', labelReceivable: 'Vencido', color: 'error' },
  CANCELLED: {
    label: 'Cancelado',
    labelReceivable: 'Cancelado',
    color: 'default',
  },
};

export function StatusChip({
  status,
  type = 'payable',
  ...props
}: StatusChipProps) {
  const config = statusConfig[status] || {
    label: status,
    labelReceivable: status,
    color: 'default' as const,
  };
  const label = type === 'receivable' ? config.labelReceivable : config.label;

  return <Chip label={label} color={config.color} size="small" {...props} />;
}
