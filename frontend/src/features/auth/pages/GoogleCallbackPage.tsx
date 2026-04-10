import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
} from '@mui/material';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code:
    'O código de autorização expirou ou já foi utilizado. Tente novamente.',
  oauth_error:
    'Ocorreu um erro durante a autenticação com Google. Tente novamente.',
  access_denied: 'Acesso negado. Você cancelou o login com Google.',
};

/**
 * Página intermediária exibida após o callback OAuth do Google.
 * O browser é redirecionado para cá pelo better-auth após autenticação Google
 * bem-sucedida. Esta página troca a sessão better-auth pelo JWT da aplicação.
 */
export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore(state => state.setAuth);
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      return ERROR_MESSAGES[oauthError] ?? ERROR_MESSAGES['oauth_error'];
    }
    return '';
  });

  useEffect(() => {
    if (error) return;
    const exchangeSession = async () => {
      try {
        // Troca a sessão OAuth (cookie better-auth) pelo JWT da aplicação
        const response = await api.post('/auth/google/token');
        const { user, accessToken } = response.data;
        setAuth(user, accessToken);

        if (user.currentOrganization) {
          navigate('/dashboard');
        } else if (user.availableOrganizations.length > 0) {
          navigate('/select-organization');
        } else if (user.isSystemAdmin) {
          navigate('/admin');
        } else {
          navigate('/select-organization');
        }
      } catch {
        setError(
          'Não foi possível completar o login com Google. Tente novamente.'
        );
      }
    };

    exchangeSession();
  }, [navigate, setAuth, error]);

  if (error) {
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
        <Box sx={{ maxWidth: 480, width: '100%' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate('/login')}
          >
            Voltar ao login
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Concluindo login com Google...
      </Typography>
    </Box>
  );
}
