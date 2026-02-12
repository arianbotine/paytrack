import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  Chip,
  CircularProgress,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { Business, SwapHoriz } from '@mui/icons-material';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { clearOrganizationStorage } from '@/shared/utils/organization-storage';

interface OrganizationSwitcherProps {
  readonly onClose: () => void;
}

export function OrganizationSwitcher({ onClose }: OrganizationSwitcherProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSwitchOrganization = async (organizationId: string) => {
    setLoading(true);
    setError('');

    // Organização atual (antes da troca)
    const previousOrgId = user?.currentOrganization?.id;

    try {
      const response = await api.post('/auth/select-organization', {
        organizationId,
      });
      const { user: updatedUser, accessToken } = response.data;

      console.log(
        `[SECURITY] Trocando organização: ${previousOrgId} -> ${organizationId}`
      );

      // 1. Limpar TODOS os caches do TanStack Query
      // CRÍTICO: Deve ser ANTES de atualizar o auth para evitar race conditions
      queryClient.clear();

      // 2. Limpar localStorage da organização ANTERIOR
      if (previousOrgId) {
        clearOrganizationStorage(previousOrgId);
      }

      // 3. Atualizar autenticação com nova organização
      setAuth(updatedUser, accessToken);

      // 4. Resetar scroll
      window.scrollTo(0, 0);

      // 5. Navegar para dashboard
      navigate('/dashboard', { replace: true });

      console.log('[SECURITY] Troca de organização concluída com sucesso');

      onClose();
    } catch (err: any) {
      console.error('[SECURITY] Erro ao trocar organização:', err);
      setError(err.response?.data?.message || 'Erro ao trocar organização');
    } finally {
      setLoading(false);
    }
  };

  const organizations = user?.availableOrganizations || [];
  const currentOrgId = user?.currentOrganization?.id;

  return (
    <>
      <MenuItem onClick={onClose} sx={{ pointerEvents: 'none' }}>
        <ListItemIcon>
          <SwapHoriz fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Trocar Organização" />
      </MenuItem>

      <Dialog
        open={true}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div">
            Trocar Organização
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Selecione a organização que deseja acessar
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <List>
            {organizations.map(org => (
              <ListItem key={org.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => handleSwitchOrganization(org.id)}
                  disabled={loading || org.id === currentOrgId}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                    opacity: org.id === currentOrgId ? 0.6 : 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Business
                      color={org.id === currentOrgId ? 'primary' : 'inherit'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Typography variant="body1" fontWeight="medium">
                          {org.name}
                        </Typography>
                        {org.id === currentOrgId && (
                          <Chip
                            label="Atual"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Função: {org.role}
                      </Typography>
                    }
                  />
                  {loading && org.id !== currentOrgId && (
                    <CircularProgress size={20} sx={{ ml: 1 }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {organizations.length === 0 && (
            <Alert severity="info">
              Você não possui acesso a outras organizações.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
