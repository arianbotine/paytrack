import { Chip, ChipProps } from '@mui/material';

type AccountStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
type AccountType = 'payable' | 'receivable';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: AccountStatus;
  type?: AccountType;
  isOverdue?: boolean; // Indicador visual de vencimento
}

const statusConfig: Record<
  AccountStatus,
  { label: string; labelReceivable: string; color: ChipProps['color'] }
> = {
  PENDING: { label: 'Pendente', labelReceivable: 'Pendente', color: 'warning' },
  PARTIAL: { label: 'Parcial', labelReceivable: 'Parcial', color: 'info' },
  PAID: { label: 'Pago', labelReceivable: 'Recebido', color: 'success' },
  CANCELLED: {
    label: 'Cancelado',
    labelReceivable: 'Cancelado',
    color: 'default',
  },
};

export function StatusChip({
  status,
  type = 'payable',
  isOverdue = false,
  ...props
}: Readonly<StatusChipProps>) {
  const config = statusConfig[status] || {
    label: status,
    labelReceivable: status,
    color: 'default' as const,
  };

  // Se estiver vencido e não estiver pago/cancelado, mostrar como erro
  const effectiveColor =
    isOverdue && status !== 'PAID' && status !== 'CANCELLED'
      ? 'error'
      : config.color;

  const label = type === 'receivable' ? config.labelReceivable : config.label;
  const effectiveLabel =
    isOverdue && status !== 'PAID' && status !== 'CANCELLED'
      ? 'Vencido'
      : label;

  return (
    <Chip
      label={effectiveLabel}
      color={effectiveColor}
      size="small"
      {...props}
    />
  );
}
