import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import { Business, People, AdminPanelSettings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const adminSections = [
    {
      title: 'Organizações',
      description: 'Gerenciar todas as organizações do sistema',
      icon: <Business sx={{ fontSize: 48 }} />,
      path: '/admin/organizations',
      color: 'primary.main',
    },
    {
      title: 'Usuários',
      description: 'Gerenciar usuários e criar novos',
      icon: <People sx={{ fontSize: 48 }} />,
      path: '/admin/users',
      color: 'secondary.main',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AdminPanelSettings
            sx={{ fontSize: 40, mr: 2, color: 'error.main' }}
          />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Painel Administrativo
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Gerencie organizações e usuários
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {adminSections.map(section => (
          <Grid item xs={12} sm={6} md={6} key={section.path}>
            <Card>
              <CardActionArea onClick={() => navigate(section.path)}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ color: section.color, mb: 2 }}>{section.icon}</Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {section.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
