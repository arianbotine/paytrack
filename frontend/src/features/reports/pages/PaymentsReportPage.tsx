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
  Tabs,
  Tab,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TableRowsIcon from '@mui/icons-material/TableRows';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { useTheme } from '@mui/material/styles';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  getOrganizationStorage,
  setOrganizationStorage,
  migrateToOrganizationStorage,
} from '@/shared/utils/organization-storage';
import {
  usePaymentsReport,
  usePaymentsReportDetails,
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
import { PaymentsReportDetailsTable } from '../components/PaymentsReportDetailsTable';
import { EmptyState } from '../../../shared/components/EmptyState';
import { calculateDateRange } from '../utils/period-calculator';
import {
  exportPaymentsReportToCSV,
  exportPaymentsReportDetailsToCSV,
} from '../utils/export-report';
import type { ReportFilters, ChartType } from '../types';

export default function PaymentsReportPage() {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const organizationId = user?.currentOrganization?.id;

  // Estado de filtros com valores padrões adequados
  const [filters, setFilters] = useState<ReportFilters>(() => {
    if (!organizationId) {
      const { startDate, endDate } = calculateDateRange('last30');
      return { startDate, endDate, groupBy: 'month' };
    }

    // Migrar dados antigos (sem organizationId) para novo formato
    migrateToOrganizationStorage(
      organizationId,
      'paymentsReportFilters',
      'reports:payments:filters'
    );

    // Buscar filtros salvos com escopo de organização
    const stored = getOrganizationStorage<ReportFilters>(
      organizationId,
      'reports:payments:filters'
    );

    if (stored) {
      // Validar que tem startDate e endDate válidos
      if (
        stored.startDate &&
        stored.endDate &&
        typeof stored.startDate === 'string' &&
        typeof stored.endDate === 'string' &&
        stored.startDate.length > 0 &&
        stored.endDate.length > 0
      ) {
        return stored;
      }
    }

    // Padrão: últimos 30 dias
    const { startDate, endDate } = calculateDateRange('last30');
    return { startDate, endDate, groupBy: 'month' };
  });

  const [chartType, setChartType] = useState<ChartType>(() => {
    if (!organizationId) return 'area';

    // Migrar dados antigos
    migrateToOrganizationStorage(
      organizationId,
      'paymentsReportChartType',
      'reports:payments:chartType'
    );

    const stored = getOrganizationStorage<ChartType>(
      organizationId,
      'reports:payments:chartType'
    );
    return stored || 'area';
  });

  const [activeTab, setActiveTab] = useState<number>(() => {
    if (!organizationId) return 0;
    return (
      getOrganizationStorage<number>(
        organizationId,
        'reports:payments:activeTab'
      ) ?? 0
    );
  });

  // Paginação da aba de detalhes — não persistida, reseta ao trocar filtros
  const [detailsPage, setDetailsPage] = useState(0);
  const [detailsRowsPerPage, setDetailsRowsPerPage] = useState(10);

  // Persist filters and chart type com escopo de organização
  useEffect(() => {
    if (organizationId) {
      setOrganizationStorage(
        organizationId,
        'reports:payments:filters',
        filters
      );
    }
  }, [filters, organizationId]);

  useEffect(() => {
    if (organizationId) {
      setOrganizationStorage(
        organizationId,
        'reports:payments:chartType',
        chartType
      );
    }
  }, [chartType, organizationId]);

  useEffect(() => {
    if (organizationId) {
      setOrganizationStorage(
        organizationId,
        'reports:payments:activeTab',
        activeTab
      );
    }
  }, [activeTab, organizationId]);

  // Resetar paginação de detalhes ao trocar filtros
  useEffect(() => {
    setDetailsPage(0);
  }, [filters]);

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

  const buildFilterLabels = () => ({
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
  });

  const handleExport = () => {
    if (!data) return;
    exportPaymentsReportToCSV(data, filters, buildFilterLabels());
  };

  const handleExportDetails = () => {
    if (!detailsData) return;
    exportPaymentsReportDetailsToCSV(detailsData, filters, buildFilterLabels());
  };

  // Fetch data — visão geral
  const { data, isLoading, error, refetch } = usePaymentsReport({
    ...filters,
    skip: 0,
    take: 10,
  });

  // Fetch data — detalhes (lazy: só ativo na aba 1)
  const {
    data: detailsData,
    isLoading: detailsLoading,
    error: detailsError,
    refetch: detailsRefetch,
  } = usePaymentsReportDetails(
    {
      ...filters,
      skip: detailsPage * detailsRowsPerPage,
      take: detailsRowsPerPage,
    },
    activeTab === 1
  );

  // Loading state (apenas aba visão geral bloqueia renderização completa)
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
        {/* Header */}
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
          {/* Export button muda conforme a aba ativa */}
          {activeTab === 0 ? (
            <Tooltip title="Exportar resumo em formato CSV">
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
          ) : (
            <Tooltip title="Exportar detalhes em formato CSV">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportDetails}
                  disabled={
                    detailsLoading ||
                    !detailsData ||
                    detailsData.data.length === 0
                  }
                >
                  Exportar Detalhes
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>

        {/* Filtros sempre visíveis */}
        <ReportFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={() => {
            refetch();
            if (activeTab === 1) detailsRefetch();
          }}
        />

        {/* Tabs */}
        <Box>
          <Tabs
            value={activeTab}
            onChange={(_, value: number) => setActiveTab(value)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab
              icon={<BarChartOutlinedIcon />}
              iconPosition="start"
              label="Visão Geral"
              value={0}
            />
            <Tab
              icon={<TableRowsIcon />}
              iconPosition="start"
              label="Detalhes"
              value={1}
            />
          </Tabs>

          {/* Aba 0 — Visão Geral */}
          {activeTab === 0 && (
            <Stack spacing={3}>
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
                          Visualize a evolução temporal dos pagamentos e
                          recebimentos. Vermelho indica saídas (contas a pagar),
                          verde indica entradas (contas a receber).
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
          )}

          {/* Aba 1 — Detalhes */}
          {activeTab === 1 && (
            <Stack spacing={2}>
              {detailsError ? (
                <EmptyState
                  variant="error"
                  title="Erro ao carregar detalhes"
                  description="Não foi possível carregar as transações. Tente novamente."
                  actionLabel="Recarregar"
                  onAction={() => detailsRefetch()}
                />
              ) : (
                <PaymentsReportDetailsTable
                  items={detailsData?.data ?? []}
                  total={detailsData?.total ?? 0}
                  page={detailsPage}
                  rowsPerPage={detailsRowsPerPage}
                  isLoading={detailsLoading}
                  onPageChange={(_, newPage) => setDetailsPage(newPage)}
                  onRowsPerPageChange={e => {
                    setDetailsRowsPerPage(Number.parseInt(e.target.value, 10));
                    setDetailsPage(0);
                  }}
                />
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
