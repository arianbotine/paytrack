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
  Avatar,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  PersonOutline,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  saveLastUser,
  loadLastUser,
  clearLastUser,
  type LastUser,
} from '@/lib/lastUserStorage';

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
  const [lastUser, setLastUser] = useState<LastUser | null>(null);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const stored = loadLastUser();
    if (stored) {
      setLastUser(stored);
      setValue('email', stored.email);
    }
  }, [setValue]);

  // Verificar se o servidor está respondendo ao carregar a página
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        await api.get('/health', {
          headers: { 'X-Silent-Request': 'true' },
        });
      } catch {
        // Ignora erros - o ServerWakeupDialog será ativado automaticamente
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

      saveLastUser({
        email: user.email,
        name: user.name,
        organizationName: user.currentOrganization?.name,
      });

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

      navigate('/select-organization');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = () => {
    clearLastUser();
    setLastUser(null);
    setSwitchingAccount(false);
    setValue('email', '');
    setError('');
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError('');
    // Navega diretamente para o backend em vez de usar fetch/CORS.
    // CDNs como o Fastly do Railway suprimem Set-Cookie de respostas CORS,
    // impedindo que o cookie de estado OAuth chegue ao browser.
    // Com navegação top-level o cookie é recebido e armazenado corretamente.
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const callbackURL = encodeURIComponent(
      `${window.location.origin}/auth/google/callback`
    );
    window.location.href = `${API_URL}/api/auth-social/initiate?provider=google&callbackURL=${callbackURL}`;
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

          {lastUser && !switchingAccount ? (
            /* ---- Modo "continuar como" ---- */
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mb: 3,
                  gap: 1,
                }}
              >
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  {lastUser.name
                    .split(' ')
                    .slice(0, 2)
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()}
                </Avatar>
                <Typography variant="h6" fontWeight="medium">
                  {lastUser.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lastUser.email}
                </Typography>
                {lastUser.organizationName && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      bgcolor: 'action.hover',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 4,
                    }}
                  >
                    {lastUser.organizationName}
                  </Typography>
                )}
              </Box>

              {/* Email oculto mas registrado no form */}
              <input type="hidden" {...register('email')} />

              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                autoComplete="current-password"
                autoFocus
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
                sx={{ mt: 3, mb: 1 }}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <LoginIcon />
                  )
                }
              >
                {loading ? 'Entrando...' : 'Continuar'}
              </Button>

              <Button
                fullWidth
                variant="text"
                size="small"
                onClick={() => setSwitchingAccount(true)}
                startIcon={<PersonOutline />}
                sx={{ color: 'text.secondary' }}
              >
                Usar outra conta
              </Button>
            </form>
          ) : (
            /* ---- Modo login normal ---- */
            <>
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

              {switchingAccount && (
                <Button
                  fullWidth
                  variant="text"
                  size="small"
                  onClick={handleSwitchAccount}
                  sx={{ mb: 1, color: 'text.secondary' }}
                >
                  Cancelar
                </Button>
              )}
            </>
          )}

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
