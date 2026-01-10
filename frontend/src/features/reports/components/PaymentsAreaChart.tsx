import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme, alpha, Box, Typography, useMediaQuery } from '@mui/material';
import {
  formatChartDate,
  formatCurrency,
  formatCompactNumber,
} from '../../../lib/utils/format';
import type { TimeSeriesData, ReportGroupBy } from '../types';

interface PaymentsAreaChartProps {
  data: TimeSeriesData[];
  groupBy: ReportGroupBy;
}

const CustomTooltip = ({ active, payload, label, groupBy }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          borderRadius: 1,
          boxShadow: 2,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {formatChartDate(label, groupBy)}
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

export const PaymentsAreaChart: React.FC<PaymentsAreaChartProps> = ({
  data,
  groupBy,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatXAxis = (value: string) => {
    const formatted = formatChartDate(value, groupBy);
    // Em mobile, mostrar apenas o número/parte principal
    return isMobile ? formatted.split(' ')[0] : formatted;
  };

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorReceivables" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={theme.palette.success.main}
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor={theme.palette.success.main}
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="colorPayables" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={theme.palette.error.main}
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor={theme.palette.error.main}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={alpha(theme.palette.divider, 0.1)}
        />
        <XAxis
          dataKey="period"
          tickFormatter={formatXAxis}
          stroke={theme.palette.text.secondary}
          style={{ fontSize: isMobile ? 10 : 12 }}
        />
        <YAxis
          tickFormatter={formatCompactNumber}
          stroke={theme.palette.text.secondary}
          style={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip groupBy={groupBy} />} />
        <Legend wrapperStyle={{ paddingTop: 20 }} />
        <Area
          type="monotone"
          dataKey="receivables"
          name="Recebido"
          stroke={theme.palette.success.dark}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorReceivables)"
        />
        <Area
          type="monotone"
          dataKey="payables"
          name="Pago"
          stroke={theme.palette.error.dark}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPayables)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
