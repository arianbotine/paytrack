import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Skeleton,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarTodayIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { AnimatedPage, ErrorBoundary } from '../../../shared/components';
import {
  getOrganizationStorage,
  setOrganizationStorage,
} from '../../../shared/utils/organization-storage';
import {
  SummaryCard,
  BalanceCard,
  CashFlowChart,
  AccountsTable,
} from '../components';

interface DashboardData {
  payableInstallments: {
    totals: {
      total: number;
      paid: number;
      pending: number;
      partial: number;
      overdue: number;
      count: number;
    };
    toPay: number;
    overdue: any[];
    upcoming: any[];
  };
  receivableInstallments: {
    totals: {
      total: number;
      paid: number;
      pending: number;
      partial: number;
      overdue: number;
      count: number;
    };
    toReceive: number;
    overdue: any[];
    upcoming: any[];
  };
  balance: {
    toReceive: number;
    toPay: number;
    net: number;
  };
  paidInPeriod: number;
  receivedInPeriod: number;
}

/**
 * Calcula o range do mês atual no fuso local do navegador, convertido para UTC ISO.
 * Segue o mesmo padrão do relatório de pagamentos.
 */
function getCurrentMonthUTCRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startLocal = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endLocal = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return {
    startDate: startLocal.toISOString(),
    endDate: endLocal.toISOString(),
  };
}

function getYearUTCRange(year: number): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: new Date(Date.UTC(year, 0, 1)).toISOString(),
    endDate: new Date(Date.UTC(year + 1, 0, 1) - 1).toISOString(),
  };
}

// Generate mock cash flow data based on current balance
function generateCashFlowData(balance: DashboardData['balance']) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(date.toLocaleDateString('pt-BR', { month: 'short' }));
  }
  const baseReceivables = balance.toReceive / 3;
  const basePayables = balance.toPay / 3;

  return months.map(month => ({
    month,
    receivables: Math.round(baseReceivables * (0.8 + Math.random() * 0.4)),
    payables: Math.round(basePayables * (0.8 + Math.random() * 0.4)),
    balance: 0,
  }));
}

function DashboardSkeleton() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {[1, 2].map(i => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton
              variant="rectangular"
              height={140}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
        ))}
        <Grid item xs={12}>
          <Skeleton
            variant="rectangular"
            height={160}
            sx={{ borderRadius: 2 }}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <Skeleton
            variant="rectangular"
            height={350}
            sx={{ borderRadius: 2 }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton
            variant="rectangular"
            height={350}
            sx={{ borderRadius: 2 }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const organizationId = user?.currentOrganization?.id;
  const [projectionPeriod, setProjectionPeriod] = useState(() => {
    if (!organizationId) return 'all';
    const stored = getOrganizationStorage<string>(
      organizationId,
      'dashboard:projectionPeriod'
    );
    return stored === 'all' || /^\d{4}$/.test(stored ?? '') ? stored! : 'all';
  });
  const [projectionOptionsOpen, setProjectionOptionsOpen] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    const stored = getOrganizationStorage<string>(
      organizationId,
      'dashboard:projectionPeriod'
    );
    setProjectionPeriod(
      stored === 'all' || /^\d{4}$/.test(stored ?? '') ? stored! : 'all'
    );
  }, [organizationId]);

  const projectionYear =
    projectionPeriod === 'all' ? undefined : Number(projectionPeriod);
  const projectionRange = projectionYear
    ? getYearUTCRange(projectionYear)
    : undefined;

  const { startDate, endDate } = getCurrentMonthUTCRange();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: [
      'dashboard',
      startDate,
      endDate,
      projectionRange?.startDate,
      projectionRange?.endDate,
    ],
    queryFn: async () => {
      const response = await api.get('/dashboard', {
        params: {
          startDate,
          endDate,
          projectionStartDate: projectionRange?.startDate,
          projectionEndDate: projectionRange?.endDate,
        },
      });
      return response.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const {
    data: projectionYears = [],
    isFetching: isFetchingProjectionYears,
    isError: isProjectionYearsError,
  } = useQuery<number[]>({
    queryKey: ['dashboard', 'projection-years', organizationId],
    queryFn: async () => {
      const response = await api.get<number[]>('/dashboard/projection-years');
      return response.data;
    },
    enabled: projectionOptionsOpen && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (
      !projectionYear ||
      !organizationId ||
      !data ||
      data.balance.toReceive !== 0 ||
      data.balance.toPay !== 0
    ) {
      return;
    }

    setProjectionPeriod('all');
    setOrganizationStorage(organizationId, 'dashboard:projectionPeriod', 'all');
  }, [data, organizationId, projectionYear]);

  useEffect(() => {
    if (error) {
      // Check if it's a 401 error (unauthorized)
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        navigate('/login');
      }
    }
  }, [error, navigate]);

  const handleProjectionPeriodChange = (event: SelectChangeEvent) => {
    const period = event.target.value;
    setProjectionPeriod(period);
    if (organizationId) {
      setOrganizationStorage(
        organizationId,
        'dashboard:projectionPeriod',
        period
      );
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <AnimatedPage>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="error" gutterBottom>
            Erro ao carregar dados do dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tente recarregar a página
          </Typography>
        </Box>
      </AnimatedPage>
    );
  }

  const cashFlowData = generateCashFlowData(data.balance);

  return (
    <ErrorBoundary>
      <AnimatedPage>
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              Dashboard
            </Typography>
          </Box>
          {/* Resumo do Mês Vigente */}
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <CalendarTodayIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="h6" fontWeight="bold">
                Resumo do Mês Vigente
              </Typography>
              <Chip
                label={new Date().toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Valores de contas a receber e a pagar apenas do período atual
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <SummaryCard
                  title="A Receber"
                  value={data.receivableInstallments.toReceive || 0}
                  subtitle={`${data.receivableInstallments.totals.count} contas`}
                  color="#16a34a"
                  icon={<TrendingUpIcon />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SummaryCard
                  title="A Pagar"
                  value={data.payableInstallments.toPay || 0}
                  subtitle={`${data.payableInstallments.totals.count} contas`}
                  color="#dc2626"
                  icon={<TrendingDownIcon />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SummaryCard
                  title="Recebido"
                  value={data.receivedInPeriod || 0}
                  subtitle="No período"
                  color="#10b981"
                  icon={<CheckCircleIcon />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SummaryCard
                  title="Pago"
                  value={data.paidInPeriod || 0}
                  subtitle="No período"
                  color="#ef4444"
                  icon={<CheckCircleIcon />}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Visão Projetada */}
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                mb: 2,
              }}
            >
              <TimelineIcon sx={{ color: 'info.main', fontSize: 20 }} />
              <Typography variant="h6" fontWeight="bold">
                Visão Projetada
              </Typography>
              <FormControl
                size="small"
                sx={{
                  minWidth: { xs: 0, sm: 170 },
                  width: { xs: '100%', sm: 'auto' },
                  maxWidth: { xs: 270, sm: '100%' },
                  flexBasis: { xs: '100%', sm: 'auto' },
                  ml: { xs: 0, sm: 'auto' },
                }}
              >
                <InputLabel id="projection-period-label">Período</InputLabel>
                <Select
                  labelId="projection-period-label"
                  id="projection-period"
                  value={projectionPeriod}
                  label="Período"
                  onChange={handleProjectionPeriodChange}
                  onOpen={() => setProjectionOptionsOpen(true)}
                  onClose={() => setProjectionOptionsOpen(false)}
                >
                  <MenuItem value="all">Todos os períodos</MenuItem>
                  {projectionYear &&
                    !projectionYears.includes(projectionYear) && (
                      <MenuItem
                        value={String(projectionYear)}
                        sx={{ display: 'none' }}
                      >
                        {projectionYear}
                      </MenuItem>
                    )}
                  {isFetchingProjectionYears && (
                    <MenuItem disabled value="__loading">
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Carregando anos...
                    </MenuItem>
                  )}
                  {isProjectionYearsError && (
                    <MenuItem disabled value="__error">
                      Não foi possível carregar os anos
                    </MenuItem>
                  )}
                  {!isFetchingProjectionYears &&
                    !isProjectionYearsError &&
                    projectionYears.length === 0 && (
                      <MenuItem disabled value="__empty">
                        Nenhuma conta registrada
                      </MenuItem>
                    )}
                  {projectionYears.map(year => (
                    <MenuItem key={year} value={String(year)}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {projectionYear
                ? `Saldo e fluxo de caixa considerando contas com vencimento em ${projectionYear}`
                : 'Saldo e fluxo de caixa considerando todos os períodos (passado, presente e futuro)'}
            </Typography>

            {/* Balance Card */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <BalanceCard
                  toReceive={data.balance.toReceive || 0}
                  toPay={data.balance.toPay || 0}
                  net={data.balance.net || 0}
                />
              </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <CashFlowChart data={cashFlowData} />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Overdue Tables */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <AccountsTable
                title="Recebimentos vencidos"
                accounts={data.receivableInstallments.overdue}
                type="receivable"
                emptyMessage="Nenhum recebimento vencido!"
                alertColor="error"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AccountsTable
                title="Pagamentos vencidos"
                accounts={data.payableInstallments.overdue}
                type="payable"
                emptyMessage="Nenhum pagamento vencido!"
                alertColor="error"
              />
            </Grid>
          </Grid>

          {/* Upcoming Tables */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <AccountsTable
                title="Recebimentos a vencer (7 dias)"
                accounts={data.receivableInstallments.upcoming}
                type="receivable"
                emptyMessage="Nenhum recebimento nos próximos 7 dias"
                alertColor="warning"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AccountsTable
                title="Pagamentos a vencer (7 dias)"
                accounts={data.payableInstallments.upcoming}
                type="payable"
                emptyMessage="Nenhum pagamento nos próximos 7 dias"
                alertColor="warning"
              />
            </Grid>
          </Grid>
        </Box>
      </AnimatedPage>
    </ErrorBoundary>
  );
}
