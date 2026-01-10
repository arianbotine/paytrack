import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Skeleton, Button } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { AnimatedPage, ErrorBoundary } from '../../../shared/components';
import {
  SummaryCard,
  BalanceCard,
  CashFlowChart,
  StatusBarChart,
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
    overdue: any[];
    upcoming: any[];
  };
  balance: {
    toReceive: number;
    toPay: number;
    net: number;
  };
}

// Generate mock cash flow data based on current balance
function generateCashFlowData(balance: DashboardData['balance']) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const baseReceivables = balance.toReceive / 3;
  const basePayables = balance.toPay / 3;

  return months.map(month => ({
    month,
    receivables: Math.round(baseReceivables * (0.8 + Math.random() * 0.4)),
    payables: Math.round(basePayables * (0.8 + Math.random() * 0.4)),
    balance: 0,
  }));
}

// Generate status data from totals
function generateStatusData(
  totals: DashboardData['payableInstallments']['totals']
) {
  return [
    { name: 'PENDING', value: totals.pending },
    { name: 'OVERDUE', value: totals.overdue },
    { name: 'PARTIAL', value: totals.partial },
  ];
}

function DashboardSkeleton() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map(i => (
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
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data;
    },
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (error) {
      // Check if it's a 401 error (unauthorized)
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        navigate('/login');
      }
    }
  }, [error, navigate]);

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
  const payableStatusData = generateStatusData(data.payableInstallments.totals);
  const receivableStatusData = generateStatusData(
    data.receivableInstallments.totals
  );

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
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['dashboard'] })
              }
            >
              Atualizar
            </Button>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Visão geral das finanças do mês vigente (
            {new Date().toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
            )
          </Typography>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="A Receber"
                value={data.balance.toReceive}
                subtitle={`${data.receivableInstallments.totals.count} contas`}
                color="#16a34a"
                icon={<TrendingUpIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="A Pagar"
                value={data.balance.toPay}
                subtitle={`${data.payableInstallments.totals.count} contas`}
                color="#dc2626"
                icon={<TrendingDownIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Vencido (Receber)"
                value={data.receivableInstallments.totals.overdue}
                color="#ea580c"
                icon={<WarningIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Vencido (Pagar)"
                value={data.payableInstallments.totals.overdue}
                color="#dc2626"
                icon={<WarningIcon />}
              />
            </Grid>
          </Grid>

          {/* Balance Card */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <BalanceCard
                toReceive={data.balance.toReceive}
                toPay={data.balance.toPay}
                net={data.balance.net}
              />
            </Grid>
          </Grid>

          {/* Charts Row */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <CashFlowChart data={cashFlowData} />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatusBarChart
                payableData={payableStatusData}
                receivableData={receivableStatusData}
              />
            </Grid>
          </Grid>

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
