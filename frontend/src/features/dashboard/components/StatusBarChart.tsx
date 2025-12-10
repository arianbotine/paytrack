import React from "react";
import { Box, Card, CardContent, Typography, useTheme } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

interface StatusData {
  name: string;
  value: number;
  color?: string;
}

interface StatusBarChartProps {
  payableData: StatusData[];
  receivableData: StatusData[];
  title?: string;
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          bgcolor: "background.paper",
          p: 1.5,
          borderRadius: 1,
          boxShadow: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          {label}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography key={index} variant="body2" sx={{ color: entry.fill }}>
            {entry.name}: {formatCurrency(entry.value)}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

export const StatusBarChart: React.FC<StatusBarChartProps> = ({
  payableData,
  receivableData,
  title = "Status das Contas",
  isLoading,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const colors = {
    grid: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    text: theme.palette.text.secondary,
    pending: theme.palette.warning.main,
    overdue: theme.palette.error.main,
    partial: theme.palette.info.main,
    paid: theme.palette.success.main,
  };

  // Combine data for horizontal comparison
  const combinedData = [
    {
      name: "Pendente",
      payable: payableData.find((d) => d.name === "PENDING")?.value || 0,
      receivable: receivableData.find((d) => d.name === "PENDING")?.value || 0,
    },
    {
      name: "Vencido",
      payable: payableData.find((d) => d.name === "OVERDUE")?.value || 0,
      receivable: receivableData.find((d) => d.name === "OVERDUE")?.value || 0,
    },
    {
      name: "Parcial",
      payable: payableData.find((d) => d.name === "PARTIAL")?.value || 0,
      receivable: receivableData.find((d) => d.name === "PARTIAL")?.value || 0,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card sx={{ height: "100%" }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Comparativo por status
          </Typography>

          {isLoading ? (
            <Box
              sx={{
                height: 250,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">Carregando...</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={combinedData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text, fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text, fontSize: 12 }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="receivable"
                  name="A Receber"
                  fill={theme.palette.success.main}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="payable"
                  name="A Pagar"
                  fill={theme.palette.error.main}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 3,
              mt: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 0.5,
                  bgcolor: "success.main",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                A Receber
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 0.5,
                  bgcolor: "error.main",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                A Pagar
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};
