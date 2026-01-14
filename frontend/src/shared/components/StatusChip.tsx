import { Chip, ChipProps } from '@mui/material';

type AccountStatus = 'PENDING' | 'PARTIAL' | 'PAID';
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

  // Se estiver vencido e não estiver pago, mostrar como erro
  const effectiveColor =
    isOverdue && status !== 'PAID' ? 'error' : config.color;

  const label = type === 'receivable' ? config.labelReceivable : config.label;
  const effectiveLabel = isOverdue && status !== 'PAID' ? 'Vencido' : label;

  return (
    <Chip
      label={effectiveLabel}
      color={effectiveColor}
      size="small"
      {...props}
    />
  );
}
