import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';

interface CashFlowData {
  month: string;
  receivables: number;
  payables: number;
  balance: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          borderRadius: 1,
          boxShadow: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          {label}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography key={index} variant="body2" sx={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  data,
  isLoading,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const colors = {
    receivables: theme.palette.success.main,
    payables: theme.palette.error.main,
    balance: theme.palette.primary.main,
    grid: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    text: theme.palette.text.secondary,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Fluxo de Caixa
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Previsão dos próximos meses
          </Typography>

          {isLoading ? (
            <Box
              sx={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography color="text.secondary">Carregando...</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorReceivables"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colors.receivables}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={colors.receivables}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="colorPayables"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colors.payables}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={colors.payables}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text, fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={value => (
                    <span style={{ color: colors.text }}>{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="receivables"
                  name="Recebimentos"
                  stroke={colors.receivables}
                  fillOpacity={1}
                  fill="url(#colorReceivables)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="payables"
                  name="Pagamentos"
                  stroke={colors.payables}
                  fillOpacity={1}
                  fill="url(#colorPayables)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
