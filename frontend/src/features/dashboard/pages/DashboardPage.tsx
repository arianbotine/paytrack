import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Alert,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { api } from "@/lib/api";
import dayjs from "dayjs";

interface DashboardData {
  payables: {
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
  receivables: {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function SummaryCard({
  title,
  value,
  subtitle,
  color,
  icon,
}: {
  title: string;
  value: number;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight="bold" color={color}>
              {formatCurrency(value)}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function AccountsTable({
  title,
  accounts,
  type,
  emptyMessage,
  alertColor,
}: {
  title: string;
  accounts: any[];
  type: "payable" | "receivable";
  emptyMessage: string;
  alertColor: "error" | "warning";
}) {
  const entityName = type === "payable" ? "vendor" : "customer";

  return (
    <Card>
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          {alertColor === "error" ? (
            <WarningIcon color="error" />
          ) : (
            <ScheduleIcon color="warning" />
          )}
          {title}
          {accounts.length > 0 && (
            <Chip
              label={accounts.length}
              size="small"
              color={alertColor}
              sx={{ ml: 1 }}
            />
          )}
        </Typography>

        {accounts.length === 0 ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            {emptyMessage}
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Descrição</TableCell>
                  <TableCell>
                    {type === "payable" ? "Credor" : "Cliente"}
                  </TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="center">Vencimento</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id} hover>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {account.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {account[entityName]?.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(
                          Number(account.amount) - Number(account.paidAmount)
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={dayjs(account.dueDate).format("DD/MM/YYYY")}
                        size="small"
                        color={alertColor}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await api.get("/dashboard");
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
          {[1, 2].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton
                variant="rectangular"
                height={300}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Erro ao carregar dados do dashboard</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="A Receber"
            value={data?.balance.toReceive || 0}
            subtitle={`${data?.receivables.totals.count || 0} contas`}
            color="#2e7d32"
            icon={<TrendingUpIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="A Pagar"
            value={data?.balance.toPay || 0}
            subtitle={`${data?.payables.totals.count || 0} contas`}
            color="#d32f2f"
            icon={<TrendingDownIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Vencido (Receber)"
            value={data?.receivables.totals.overdue || 0}
            color="#ed6c02"
            icon={<WarningIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Vencido (Pagar)"
            value={data?.payables.totals.overdue || 0}
            color="#d32f2f"
            icon={<WarningIcon />}
          />
        </Grid>
      </Grid>

      {/* Balance Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Saldo Projetado
          </Typography>
          <Typography
            variant="h3"
            fontWeight="bold"
            color={
              (data?.balance.net || 0) >= 0 ? "success.main" : "error.main"
            }
          >
            {formatCurrency(data?.balance.net || 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Diferença entre valores a receber e a pagar
          </Typography>
        </CardContent>
      </Card>

      {/* Overdue Tables */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <AccountsTable
            title="Recebimentos Vencidos"
            accounts={data?.receivables.overdue || []}
            type="receivable"
            emptyMessage="Nenhum recebimento vencido!"
            alertColor="error"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AccountsTable
            title="Pagamentos Vencidos"
            accounts={data?.payables.overdue || []}
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
            title="Recebimentos Próximos (7 dias)"
            accounts={data?.receivables.upcoming || []}
            type="receivable"
            emptyMessage="Nenhum recebimento nos próximos 7 dias"
            alertColor="warning"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AccountsTable
            title="Pagamentos Próximos (7 dias)"
            accounts={data?.payables.upcoming || []}
            type="payable"
            emptyMessage="Nenhum pagamento nos próximos 7 dias"
            alertColor="warning"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
