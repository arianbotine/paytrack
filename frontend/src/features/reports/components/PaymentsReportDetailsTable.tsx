import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountBalance as ReceivableIcon,
  Payment as PayableIcon,
  SwapHoriz as MixedIcon,
} from '@mui/icons-material';
import { TableSkeleton, EmptyState } from '../../../shared/components';
import { formatCurrency } from '../../../shared/utils/currencyUtils';
import { formatLocalDate } from '../../../shared/utils/dateUtils';
import { getMethodLabel } from '../../payments/types';
import type {
  PaymentsReportDetailItem,
  PaymentsReportDetailType,
  ReportTag,
} from '../types';

interface PaymentsReportDetailsTableProps {
  items: PaymentsReportDetailItem[];
  total: number;
  page: number;
  rowsPerPage: number;
  isLoading: boolean;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const TYPE_CONFIG: Record<
  PaymentsReportDetailType,
  {
    label: string;
    color: 'error' | 'success' | 'default';
    icon: React.ReactElement;
  }
> = {
  payable: {
    label: 'Pagamento',
    color: 'error',
    icon: <PayableIcon />,
  },
  receivable: {
    label: 'Recebimento',
    color: 'success',
    icon: <ReceivableIcon />,
  },
  mixed: {
    label: 'Misto',
    color: 'default',
    icon: <MixedIcon />,
  },
};

function TypeChip({ type }: Readonly<{ type: PaymentsReportDetailType }>) {
  const config = TYPE_CONFIG[type];
  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
}

function TagChips({ tags }: Readonly<{ tags: ReportTag[] }>) {
  if (tags.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
      {tags.map(tag => (
        <Chip
          key={tag.id}
          label={tag.name}
          size="small"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: '0.65rem',
            borderColor: tag.color ?? undefined,
            color: tag.color ?? undefined,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      ))}
    </Box>
  );
}

export function PaymentsReportDetailsTable({
  items,
  total,
  page,
  rowsPerPage,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
}: Readonly<PaymentsReportDetailsTableProps>) {
  if (isLoading) {
    return <TableSkeleton rows={rowsPerPage} columns={6} />;
  }

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        title="Sem transações no período"
        description="Não foram encontradas transações com os filtros aplicados."
      />
    );
  }

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Fornecedor / Cliente</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Método</TableCell>
              <TableCell align="right">Valor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => {
              const counterpart = item.vendorName || item.customerName || '—';

              let amountColor = 'text.primary';
              if (item.type === 'receivable') {
                amountColor = 'success.main';
              } else if (item.type === 'payable') {
                amountColor = 'error.main';
              }

              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Tooltip
                      title={new Date(item.paymentDate).toLocaleString('pt-BR')}
                    >
                      <span>{formatLocalDate(item.paymentDate)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <TypeChip type={item.type} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                      {counterpart}
                    </Typography>
                    <TagChips tags={item.tags} />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ maxWidth: 160 }}
                    >
                      {item.categoryName || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getMethodLabel(item.paymentMethod)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color={amountColor}
                    >
                      {formatCurrency(item.amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="flex-end">
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => {
            const totalLabel = count === -1 ? `mais de ${to}` : String(count);
            return `${from}–${to} de ${totalLabel}`;
          }}
        />
      </Box>
    </Paper>
  );
}
