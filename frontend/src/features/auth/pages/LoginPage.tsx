import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { socialAuthClient } from '@/lib/social-auth';
import { useAuthStore } from '@/lib/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Verificar se o servidor está respondendo ao carregar a página
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        // Faz uma requisição simples para verificar se o servidor está respondendo
        // Isso vai ativar o ServerWakeupDialog se o servidor estiver frio
        await api.get('/health', {
          headers: { 'X-Silent-Request': 'true' },
        });
      } catch {
        // Ignora erros - o ServerWakeupDialog será ativado automaticamente
        // se o servidor estiver frio
      }
    };

    checkServerStatus();
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', data);
      const { user, accessToken } = response.data;
      setAuth(user, accessToken);

      if (user.currentOrganization) {
        navigate('/dashboard');
        return;
      }

      if (user.availableOrganizations.length > 0) {
        navigate('/select-organization');
        return;
      }

      if (user.isSystemAdmin) {
        navigate('/admin');
        return;
      }

      // User has no organizations and is not system admin
      navigate('/select-organization');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await socialAuthClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/auth/google/callback`,
      });
    } catch {
      setError('Erro ao iniciar login com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  };

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
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              fontWeight="bold"
              color="primary"
            >
              PayTrack
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Sistema de Contas a Pagar e Receber
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
              autoFocus
            />

            <TextField
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || googleLoading}
              sx={{ mt: 3, mb: 2 }}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <LoginIcon />
                )
              }
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ou
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            disabled={loading || googleLoading}
            onClick={handleGoogleLogin}
            startIcon={
              googleLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Box
                  component="img"
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  sx={{ width: 20, height: 20 }}
                />
              )
            }
            sx={{ mb: 1 }}
          >
            {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
