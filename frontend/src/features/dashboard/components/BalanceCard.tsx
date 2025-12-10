import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

interface BalanceCardProps {
  toReceive: number;
  toPay: number;
  net: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export const BalanceCard: React.FC<BalanceCardProps> = ({
  toReceive,
  toPay,
  net,
}) => {
  const theme = useTheme();
  const isPositive = net >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card
        sx={{
          background: isPositive
            ? `linear-gradient(135deg, ${alpha(
                theme.palette.success.main,
                0.1
              )} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`
            : `linear-gradient(135deg, ${alpha(
                theme.palette.error.main,
                0.1
              )} 0%, ${alpha(theme.palette.error.light, 0.05)} 100%)`,
          border: '1px solid',
          borderColor: isPositive
            ? alpha(theme.palette.success.main, 0.2)
            : alpha(theme.palette.error.main, 0.2),
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Saldo Projetado
              </Typography>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  sx={{
                    color: isPositive ? 'success.main' : 'error.main',
                  }}
                >
                  {formatCurrency(net)}
                </Typography>
              </motion.div>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Diferença entre valores a receber e a pagar
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: '50%',
                bgcolor: isPositive
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                color: isPositive ? 'success.main' : 'error.main',
              }}
            >
              {isPositive ? (
                <TrendingUpIcon sx={{ fontSize: 40 }} />
              ) : (
                <TrendingDownIcon sx={{ fontSize: 40 }} />
              )}
            </Box>
          </Box>

          {/* Mini indicators */}
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              mt: 3,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total a Receber
              </Typography>
              <Typography
                variant="body1"
                fontWeight="bold"
                color="success.main"
              >
                {formatCurrency(toReceive)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total a Pagar
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="error.main">
                {formatCurrency(toPay)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};
