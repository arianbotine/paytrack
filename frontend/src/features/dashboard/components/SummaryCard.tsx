import React from "react";
import { Box, Card, CardContent, Typography, alpha } from "@mui/material";
import { motion } from "framer-motion";

interface SummaryCardProps {
  title: string;
  value: number;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  color,
  icon,
  trend,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        sx={{
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            bgcolor: color,
          },
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                color="text.secondary"
                gutterBottom
                variant="body2"
                fontWeight={500}
              >
                {title}
              </Typography>
              <Typography variant="h5" fontWeight="bold" sx={{ color }}>
                {formatCurrency(value)}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
              {trend && (
                <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: trend.isPositive ? "success.main" : "error.main",
                      fontWeight: 500,
                    }}
                  >
                    {trend.isPositive ? "+" : "-"}
                    {Math.abs(trend.value)}%
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 0.5 }}
                  >
                    vs mês anterior
                  </Typography>
                </Box>
              )}
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(color, 0.12),
                color: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};
