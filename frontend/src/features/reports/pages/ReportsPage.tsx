import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PaymentIcon from '@mui/icons-material/Payment';
import ListAltIcon from '@mui/icons-material/ListAlt';

interface ReportCardItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  enabled: boolean;
}

export default function ReportsPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const reports: ReportCardItem[] = [
    {
      id: 'payments',
      title: 'Pagamentos Realizados',
      description: 'Acompanhe pagamentos e recebimentos por período',
      icon: <PaymentIcon fontSize="large" color="primary" />,
      path: '/reports/payments',
      enabled: true,
    },
    {
      id: 'installment-items',
      title: 'Itens por Tag',
      description: 'Liste itens de parcelas filtrando por tag',
      icon: <ListAltIcon fontSize="large" color="primary" />,
      path: '/reports/installment-items',
      enabled: true,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Relatórios
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualize e analise dados financeiros da sua organização
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {reports.map(report => (
          <Grid item xs={12} sm={6} md={3} key={report.id}>
            <motion.div
              whileHover={report.enabled ? { y: -4, scale: 1.02 } : {}}
              transition={{ duration: 0.2 }}
            >
              <Card
                onClick={() => report.enabled && navigate(report.path)}
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.1
                  )} 0%, transparent 100%)`,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  borderRadius: 2,
                  cursor: report.enabled ? 'pointer' : 'not-allowed',
                  opacity: report.enabled ? 1 : 0.6,
                  transition: 'all 0.2s',
                }}
              >
                <CardContent>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      {report.icon}
                      <Typography variant="h6">{report.title}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {report.description}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
