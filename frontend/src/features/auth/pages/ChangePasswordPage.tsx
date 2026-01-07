import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useUIStore } from '../../../lib/stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/PageHeader';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useUIStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const mutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/users/me/password', data),
    onSuccess: () => {
      showNotification('Senha alterada com sucesso!', 'success');
      reset();
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao alterar senha';
      showNotification(message, 'error');
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    mutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  // Password strength indicators
  const hasMinLength = newPassword.length >= 6;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const passwordStrength = [
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
  ].filter(Boolean).length;

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'default';
    if (passwordStrength <= 2) return 'error';
    if (passwordStrength === 3) return 'warning';
    return 'success';
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Fraca';
    if (passwordStrength === 3) return 'Média';
    return 'Forte';
  };

  return (
    <Box>
      <PageHeader
        title="Alterar Senha"
        subtitle="Mantenha sua conta segura com uma senha forte"
      />

      <Container maxWidth="sm" sx={{ mt: 2 }}>
        <Card elevation={2}>
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <LockIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Typography variant="h6" gutterBottom>
                Criar Nova Senha
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Sua senha deve ter no mínimo 6 caracteres
              </Typography>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Controller
                  name="currentPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Senha Atual"
                      type={showCurrentPassword ? 'text' : 'password'}
                      fullWidth
                      error={!!errors.currentPassword}
                      helperText={errors.currentPassword?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                              edge="end"
                            >
                              {showCurrentPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nova Senha"
                      type={showNewPassword ? 'text' : 'password'}
                      fullWidth
                      error={!!errors.newPassword}
                      helperText={errors.newPassword?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              edge="end"
                            >
                              {showNewPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                {newPassword && (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      gutterBottom
                    >
                      Força da senha:{' '}
                      <Typography
                        component="span"
                        variant="caption"
                        color={`${getStrengthColor()}.main`}
                        fontWeight="bold"
                      >
                        {getStrengthText()}
                      </Typography>
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <CheckIcon
                          fontSize="small"
                          color={hasMinLength ? 'success' : 'disabled'}
                        />
                        <Typography
                          variant="caption"
                          color={
                            hasMinLength ? 'text.primary' : 'text.disabled'
                          }
                        >
                          Mínimo 6 caracteres
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <CheckIcon
                          fontSize="small"
                          color={hasUpperCase ? 'success' : 'disabled'}
                        />
                        <Typography
                          variant="caption"
                          color={
                            hasUpperCase ? 'text.primary' : 'text.disabled'
                          }
                        >
                          Letra maiúscula
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <CheckIcon
                          fontSize="small"
                          color={hasLowerCase ? 'success' : 'disabled'}
                        />
                        <Typography
                          variant="caption"
                          color={
                            hasLowerCase ? 'text.primary' : 'text.disabled'
                          }
                        >
                          Letra minúscula
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <CheckIcon
                          fontSize="small"
                          color={hasNumber ? 'success' : 'disabled'}
                        />
                        <Typography
                          variant="caption"
                          color={hasNumber ? 'text.primary' : 'text.disabled'}
                        >
                          Número
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Confirmar Nova Senha"
                      type={showConfirmPassword ? 'text' : 'password'}
                      fullWidth
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              edge="end"
                            >
                              {showConfirmPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Dicas de segurança:</strong>
                  </Typography>
                  <Typography variant="body2">
                    • Use uma senha única que não utilize em outros sites
                  </Typography>
                  <Typography variant="body2">
                    • Evite informações pessoais óbvias
                  </Typography>
                  <Typography variant="body2">
                    • Combine letras, números e caracteres especiais
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate('/dashboard')}
                    disabled={mutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={mutation.isPending}
                    startIcon={
                      mutation.isPending ? (
                        <CircularProgress size={16} />
                      ) : (
                        <LockIcon />
                      )
                    }
                  >
                    {mutation.isPending ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </Box>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
