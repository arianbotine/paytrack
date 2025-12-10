import React from "react";
import { Box, Card, CardContent, Typography, useTheme } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryDonutChartProps {
  data: CategoryData[];
  title: string;
  subtitle?: string;
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
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
          {data.name}
        </Typography>
        <Typography variant="body2">{formatCurrency(data.value)}</Typography>
      </Box>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
      {payload.map((entry: any, index: number) => (
        <Box
          key={index}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: entry.color,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {entry.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  data,
  title,
  subtitle,
  isLoading,
}) => {
  const theme = useTheme();

  // Default colors if no color provided
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7c43",
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card sx={{ height: "100%" }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}

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
          ) : data.length === 0 ? (
            <Box
              sx={{
                height: 250,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">
                Nenhum dado disponível
              </Typography>
            </Box>
          ) : (
            <Box sx={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.color ||
                          defaultColors[index % defaultColors.length]
                        }
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center text */}
              <Box
                sx={{
                  position: "absolute",
                  top: "40%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(total)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
