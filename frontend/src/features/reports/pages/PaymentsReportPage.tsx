import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Button,
  Tooltip,
  Stack,
  Typography,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useTheme } from '@mui/material/styles';
import {
  usePaymentsReport,
  useReportCategories,
  useReportTags,
  useReportVendors,
  useReportCustomers,
} from '../hooks/useReports';
import { ReportCard } from '../components/ReportCard';
import { ReportSkeleton } from '../components/ReportSkeleton';
import { PaymentsAreaChart } from '../components/PaymentsAreaChart';
import { PaymentsBarChart } from '../components/PaymentsBarChart';
import { ReportFilters as ReportFiltersComponent } from '../components/ReportFilters';
import { EmptyState } from '../../../shared/components/EmptyState';
import { calculateDateRange } from '../utils/period-calculator';
import { exportPaymentsReportToCSV } from '../utils/export-report';
import type { ReportFilters, ChartType } from '../types';

export default function PaymentsReportPage() {
  const theme = useTheme();

  // Estado de filtros com valores padrões adequados
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const stored = localStorage.getItem('paymentsReportFilters');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrar filtros antigos que usavam 'period'
        if ('period' in parsed) {
          // Limpar localStorage antigo
          localStorage.removeItem('paymentsReportFilters');
          // Usar padrão
          const { startDate, endDate } = calculateDateRange('last30');
          return { startDate, endDate, groupBy: parsed.groupBy || 'month' };
        }
        // Validar que tem startDate e endDate válidos
        if (
          parsed.startDate &&
          parsed.endDate &&
          typeof parsed.startDate === 'string' &&
          typeof parsed.endDate === 'string' &&
          parsed.startDate.length > 0 &&
          parsed.endDate.length > 0
        ) {
          return parsed;
        }
      } catch {
        // Se houver erro ao parsear, limpar localStorage
        localStorage.removeItem('paymentsReportFilters');
      }
    }
    // Padrão: últimos 30 dias
    const { startDate, endDate } = calculateDateRange('last30');
    return { startDate, endDate, groupBy: 'month' };
  });

  const [chartType, setChartType] = useState<ChartType>(() => {
    const stored = localStorage.getItem('paymentsReportChartType');
    return (stored as ChartType) || 'area';
  });

  // Persist filters and chart type
  useEffect(() => {
    localStorage.setItem('paymentsReportFilters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('paymentsReportChartType', chartType);
  }, [chartType]);

  const handleFiltersChange = (newFilters: ReportFilters) => {
    // Garantir que sempre temos startDate e endDate válidos
    if (!newFilters.startDate || !newFilters.endDate) {
      console.warn('Filtros inválidos detectados, usando padrão last30');
      const { startDate, endDate } = calculateDateRange('last30');
      setFilters({ ...newFilters, startDate, endDate });
    } else {
      setFilters(newFilters);
    }
  };

  // Buscar dados dos filtros para labels na exportação
  const { data: categories = [] } = useReportCategories();
  const { data: tags = [] } = useReportTags();
  const { data: vendors = [] } = useReportVendors();
  const { data: customers = [] } = useReportCustomers();

  const handleExport = () => {
    if (!data) return;

    // Obter nomes dos filtros aplicados
    const filterLabels = {
      categories: categories
        .filter(cat => filters.categoryIds?.includes(cat.id))
        .map(cat => cat.name),
      tags: tags
        .filter(tag => filters.tagIds?.includes(tag.id))
        .map(tag => tag.name),
      vendors: vendors
        .filter(vendor => filters.vendorIds?.includes(vendor.id))
        .map(vendor => vendor.name),
      customers: customers
        .filter(customer => filters.customerIds?.includes(customer.id))
        .map(customer => customer.name),
    };

    exportPaymentsReportToCSV(data, filters, filterLabels);
  };

  // Fetch data
  const { data, isLoading, error, refetch } = usePaymentsReport({
    ...filters,
    skip: 0,
    take: 10,
  });

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <ReportSkeleton chartType={chartType} />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <EmptyState
          variant="error"
          title="Erro ao carregar relatório"
          description="Não foi possível carregar os dados. Tente novamente."
          actionLabel="Recarregar"
          onAction={() => refetch()}
        />
      </Container>
    );
  }

  const hasNoData = !data?.timeSeries || data.timeSeries.length === 0;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header com botão de exportação */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              fontWeight="bold"
              gutterBottom
            >
              Relatório de Pagamentos
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 600 }}
            >
              Acompanhe o desempenho financeiro da sua organização com dados
              consolidados de pagamentos e recebimentos. Compare períodos e
              identifique tendências para melhor tomada de decisão.
            </Typography>
          </Box>
          <Tooltip title="Exportar relatório em formato CSV">
            <span>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                disabled={isLoading || !data || hasNoData}
              >
                Exportar
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Filtros sempre visíveis */}
        <ReportFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={() => refetch()}
        />

        {/* Empty state se não houver dados */}
        {hasNoData && (
          <EmptyState
            title="Sem dados disponíveis"
            description="Não há transações financeiras para o período selecionado. Tente ajustar os filtros acima (período, categorias, tags) ou adicionar novos pagamentos e recebimentos no sistema."
            icon={<PaymentIcon fontSize="large" />}
          />
        )}

        {/* KPI Cards - só renderiza se tiver dados */}
        {!hasNoData && (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <ReportCard
                  title="Total Pago"
                  value={data.totals.payables.current}
                  color={theme.palette.error.main}
                  icon={<PaymentIcon />}
                  helpText="Soma de todos os pagamentos realizados (contas a pagar) no período selecionado."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <ReportCard
                  title="Total Recebido"
                  value={data.totals.receivables.current}
                  color={theme.palette.success.main}
                  icon={<AccountBalanceIcon />}
                  helpText="Soma de todos os recebimentos (contas a receber) efetivados no período selecionado."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <ReportCard
                  title="Saldo Líquido"
                  value={data.totals.netBalance.current}
                  color={theme.palette.info.main}
                  icon={<TrendingUpIcon />}
                  helpText="Diferença entre o total recebido e o total pago no período. Valores positivos indicam superávit, negativos indicam déficit."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <ReportCard
                  title="Transações"
                  value={data.totals.transactions.current}
                  color={theme.palette.primary.main}
                  icon={<ReceiptIcon />}
                  helpText="Quantidade total de transações financeiras (pagamentos + recebimentos) processadas no período. Útil para acompanhar o volume operacional."
                  valueType="number"
                />
              </Grid>
            </Grid>

            {/* Chart Controls */}
            <Paper sx={{ p: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Evolução Financeira
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Visualize a evolução temporal dos pagamentos e recebimentos.
                    Vermelho indica saídas (contas a pagar), verde indica
                    entradas (contas a receber).
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={(_, value) => value && setChartType(value)}
                  size="small"
                >
                  <ToggleButton value="area">
                    <ShowChartIcon sx={{ mr: 1 }} />
                    Área
                  </ToggleButton>
                  <ToggleButton value="bar">
                    <BarChartIcon sx={{ mr: 1 }} />
                    Barras
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Chart */}
              {chartType === 'area' ? (
                <PaymentsAreaChart
                  data={data.timeSeries}
                  groupBy={filters.groupBy || 'month'}
                />
              ) : (
                <PaymentsBarChart
                  data={data.timeSeries}
                  groupBy={filters.groupBy || 'month'}
                />
              )}
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  );
}
