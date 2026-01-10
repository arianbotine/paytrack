import {
  BarChart,
  Bar,
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

interface PaymentsBarChartProps {
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

export const PaymentsBarChart: React.FC<PaymentsBarChartProps> = ({
  data,
  groupBy,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatXAxis = (value: string) => {
    const formatted = formatChartDate(value, groupBy);
    return isMobile ? formatted.split(' ')[0] : formatted;
  };

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
        <Bar
          dataKey="receivables"
          name="Recebido"
          fill={theme.palette.success.main}
          radius={[8, 8, 0, 0]}
          barSize={isMobile ? 20 : 40}
        />
        <Bar
          dataKey="payables"
          name="Pago"
          fill={theme.palette.error.main}
          radius={[8, 8, 0, 0]}
          barSize={isMobile ? 20 : 40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
