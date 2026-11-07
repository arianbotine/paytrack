import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaymentIcon from '@mui/icons-material/Payment';
import { useTheme } from '@mui/material/styles';
import { useUIStore } from '@/lib/stores/uiStore';
import { EmptyState, TableSkeleton } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/currencyUtils';
import { formatLocalDate } from '@/shared/utils/dateUtils';
import { ReportCard } from '../components/ReportCard';
import {
  fetchAllPendingAccountsReport,
  usePendingAccountsReport,
} from '../hooks/useReports';
import { exportPendingAccountsReportToCSV } from '../utils/export-report';
import {
  calculatePendingAccountsDateRange,
  type PendingAccountsPeriodPreset,
} from '../utils/period-calculator';
import type { PendingAccountType, PendingAccountsDueStatus } from '../types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const UPCOMING_PRESETS: {
  value: PendingAccountsPeriodPreset;
  label: string;
}[] = [
  { value: 'next7', label: 'Próximos 7 dias' },
  { value: 'next15', label: 'Próximos 15 dias' },
  { value: 'next30', label: 'Próximos 30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'nextMonth', label: 'Próximo mês' },
  { value: 'allUpcoming', label: 'Todos a vencer' },
];
const OVERDUE_PRESETS: { value: PendingAccountsPeriodPreset; label: string }[] =
  [
    { value: 'allOverdue', label: 'Todos em atraso' },
    { value: 'overdue7', label: 'Últimos 7 dias' },
    { value: 'overdue30', label: 'Últimos 30 dias' },
    { value: 'lastMonth', label: 'Mês passado' },
  ];

export default function PendingAccountsReportPage() {
  const theme = useTheme();
  const showNotification = useUIStore(state => state.showNotification);
  const [type, setType] = useState<PendingAccountType>('ALL');
  const [dueStatus, setDueStatus] =
    useState<PendingAccountsDueStatus>('UPCOMING');
  const [dateRange, setDateRange] = useState(() =>
    calculatePendingAccountsDateRange('next30')
  );
  const [periodShortcut, setPeriodShortcut] = useState<
    PendingAccountsPeriodPreset | ''
  >('next30');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [isExporting, setIsExporting] = useState(false);

  const { startDate, endDate } = dateRange;
  const periodPresets =
    dueStatus === 'UPCOMING' ? UPCOMING_PRESETS : OVERDUE_PRESETS;
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate);
  const filters = {
    type,
    dueStatus,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    skip: page * rowsPerPage,
    take: rowsPerPage,
  };
  const { data, isLoading, isError, refetch } = usePendingAccountsReport(
    filters,
    !invalidDateRange
  );

  async function handleExport() {
    setIsExporting(true);
    try {
      const report = await fetchAllPendingAccountsReport({
        type,
        dueStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      exportPendingAccountsReportToCSV(report.data, {
        type,
        dueStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } catch {
      showNotification(
        'Não foi possível exportar o relatório. Tente novamente.',
        'error'
      );
    } finally {
      setIsExporting(false);
    }
  }

  function updateType(value: PendingAccountType) {
    setType(value);
    setPage(0);
  }

  function updateDate(field: 'startDate' | 'endDate', value: string) {
    setDateRange(current => ({ ...current, [field]: value }));
    setPeriodShortcut('');
    setPage(0);
  }

  function applyDueStatus(value: PendingAccountsDueStatus) {
    setDueStatus(value);
    const defaultPreset = value === 'UPCOMING' ? 'next30' : 'allOverdue';
    setDateRange(calculatePendingAccountsDateRange(defaultPreset));
    setPeriodShortcut(defaultPreset);
    setPage(0);
  }

  function applyPeriodShortcut(preset: PendingAccountsPeriodPreset) {
    setDateRange(calculatePendingAccountsDateRange(preset));
    setPeriodShortcut(preset);
    setPage(0);
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700}>
              Contas Pendentes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Acompanhe os saldos em aberto por parcela, a pagar e a receber.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            disabled={
              isLoading || isExporting || !data?.total || invalidDateRange
            }
          >
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </Box>

        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={dueStatus}
                aria-label="Situação do vencimento"
                onChange={(_, value: PendingAccountsDueStatus | null) => {
                  if (value) applyDueStatus(value);
                }}
              >
                <ToggleButton value="UPCOMING" sx={{ flex: 1 }}>
                  A vencer
                </ToggleButton>
                <ToggleButton value="OVERDUE" sx={{ flex: 1 }}>
                  Em atraso
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de conta"
                value={type}
                onChange={event =>
                  updateType(event.target.value as PendingAccountType)
                }
              >
                <MenuItem value="ALL">Todas</MenuItem>
                <MenuItem value="PAYABLE">A pagar</MenuItem>
                <MenuItem value="RECEIVABLE">A receber</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Vencimento a partir de"
                value={startDate}
                onChange={event => updateDate('startDate', event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Vencimento até"
                value={endDate}
                onChange={event => updateDate('endDate', event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Períodos rápidos
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={periodShortcut}
                aria-label="Período de vencimento"
                onChange={(_, value: PendingAccountsPeriodPreset | null) => {
                  if (value) applyPeriodShortcut(value);
                }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {periodPresets.map(preset => (
                  <ToggleButton key={preset.value} value={preset.value}>
                    {preset.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>
          {invalidDateRange && (
            <Alert severity="error" sx={{ mt: 2 }}>
              A data inicial não pode ser posterior à data final.
            </Alert>
          )}
        </Paper>

        {data && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <ReportCard
                title={`A pagar (${data.summary.payableCount})`}
                value={data.summary.payableOutstandingAmount}
                color={theme.palette.error.main}
                icon={<PaymentIcon />}
                helpText="Saldo total em aberto nas parcelas de contas a pagar."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ReportCard
                title={`A receber (${data.summary.receivableCount})`}
                value={data.summary.receivableOutstandingAmount}
                color={theme.palette.success.main}
                icon={<AccountBalanceIcon />}
                helpText="Saldo total em aberto nas parcelas de contas a receber."
              />
            </Grid>
          </Grid>
        )}

        {isError ? (
          <EmptyState
            variant="error"
            title="Erro ao carregar relatório"
            description="Não foi possível carregar as contas pendentes. Tente novamente."
            actionLabel="Recarregar"
            onAction={() => refetch()}
          />
        ) : isLoading ? (
          <TableSkeleton rows={rowsPerPage} columns={9} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title="Nenhuma conta pendente"
            description={
              dueStatus === 'OVERDUE'
                ? 'Não há parcelas vencidas para os filtros selecionados.'
                : 'Não há parcelas a vencer no período selecionado.'
            }
          />
        ) : (
          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Fornecedor / Cliente</TableCell>
                    <TableCell>Conta / Parcela</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="right">Pago / Recebido</TableCell>
                    <TableCell align="right">Em aberto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map(item => (
                    <TableRow key={item.installmentId} hover>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            item.type === 'PAYABLE' ? 'A pagar' : 'A receber'
                          }
                          color={item.type === 'PAYABLE' ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.counterpartyName}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.accountNotes ||
                            `Conta ${item.accountId.slice(0, 8)}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Parcela {item.installmentNumber}/
                          {item.totalInstallments}
                          {item.installmentNotes
                            ? ` · ${item.installmentNotes}`
                            : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.categoryName || '—'}</TableCell>
                      <TableCell>{formatLocalDate(item.dueDate)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            item.isOverdue
                              ? 'Vencida'
                              : item.status === 'PARTIAL'
                                ? 'Parcial'
                                : 'Pendente'
                          }
                          color={
                            item.isOverdue
                              ? 'error'
                              : item.status === 'PARTIAL'
                                ? 'info'
                                : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.settledAmount)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(item.outstandingAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={event => {
                setRowsPerPage(Number.parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              labelRowsPerPage="Linhas por página:"
            />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
