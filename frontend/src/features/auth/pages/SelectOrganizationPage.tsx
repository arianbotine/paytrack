import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Business, AdminPanelSettings, Logout } from '@mui/icons-material';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';

const getRoleChipColor = (role: string) => {
  switch (role) {
    case 'OWNER':
      return 'primary';
    case 'ADMIN':
      return 'secondary';
    default:
      return 'default';
  }
};

export function SelectOrganizationPage() {
  const navigate = useNavigate();
  const { user, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectOrganization = async (organizationId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/select-organization', {
        organizationId,
      });
      const { user: updatedUser, accessToken } = response.data;
      setAuth(updatedUser, accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao selecionar organização');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const organizations = user.availableOrganizations || [];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" component="h1" fontWeight="bold">
              Selecione uma Organização
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Você possui acesso a múltiplas organizações
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {organizations.length === 0 && !user.isSystemAdmin && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Você não possui acesso a nenhuma organização. Entre em contato com
              o administrador.
            </Alert>
          )}

          {organizations.length === 0 && user.isSystemAdmin && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Nenhuma organização cadastrada no sistema. Acesse o painel admin
              para criar uma organização.
            </Alert>
          )}

          {organizations.length > 0 && user.isSystemAdmin && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Como administrador do sistema, você pode acessar o painel admin
              sem selecionar uma organização.
            </Alert>
          )}

          <List>
            {organizations.map(org => (
              <ListItem key={org.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => handleSelectOrganization(org.id)}
                  disabled={loading}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Business sx={{ mr: 2, color: 'primary.main' }} />
                  <ListItemText
                    primary={org.name}
                    secondary={`Permissão: ${org.role}`}
                  />
                  <Chip
                    label={org.role}
                    size="small"
                    color={getRoleChipColor(org.role)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {user.isSystemAdmin && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<AdminPanelSettings />}
                onClick={() => navigate('/admin')}
                fullWidth
              >
                Ir para Painel Admin
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="text"
              color="secondary"
              startIcon={<Logout />}
              onClick={handleLogout}
              fullWidth
            >
              Sair do Sistema
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
