import React from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Collapse,
  Divider,
  Chip,
} from '@mui/material';
import { BatchAccount } from '../types';

interface BatchAccountInstallmentsPreviewProps {
  account: BatchAccount;
  showInstallments: boolean;
  formatCurrency: (value: number) => string;
}

/**
 * Componente que renderiza o preview expandido das parcelas.
 * Mostra detalhamento de cada parcela com valor e data.
 */
export const BatchAccountInstallmentsPreview: React.FC<
  BatchAccountInstallmentsPreviewProps
> = ({ account, showInstallments, formatCurrency }) => {
  if (account.installmentCount <= 1) {
    return null;
  }

  return (
    <Grid item xs={12}>
      <Collapse in={showInstallments}>
        <Box sx={{ mt: 1 }}>
          <Divider sx={{ mb: 2 }}>
            <Chip label="Detalhamento das Parcelas" size="small" />
          </Divider>
          <Grid container spacing={1}>
            {account.dueDates.map((date, idx) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={`installment-${idx}`}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    bgcolor: 'action.hover',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.selected',
                      transform: 'translateY(-2px)',
                      boxShadow: 2,
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Parcela {idx + 1}/{account.installmentCount}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ mt: 0.5 }}
                  >
                    {formatCurrency(account.amount / account.installmentCount)}
                  </Typography>
                  <Typography variant="caption" color="primary">
                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>
    </Grid>
  );
};
