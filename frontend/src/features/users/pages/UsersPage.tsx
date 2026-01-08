import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Typography,
  Grid,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useUIStore } from '../../../lib/stores/uiStore';
import { useAuthStore } from '../../../lib/stores/authStore';
import { formatLocalDate } from '../../../shared/utils/dateUtils';

const userSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    email: z.string().email('E-mail inválido'),
    password: z
      .string()
      .min(1, 'Senha é obrigatória')
      .optional()
      .or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
    role: z.enum(['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER']),
    isActive: z.boolean(),
  })
  .refine(
    data => {
      // Only validate password confirmation when creating a new user or when password is provided
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'As senhas não coincidem',
      path: ['confirmPassword'],
    }
  );

type UserFormData = z.infer<typeof userSchema>;

type CreateUserData = Omit<UserFormData, 'isActive'>;

interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const ROLES = [
  { value: 'OWNER', label: 'Proprietário', color: 'error' as const },
  { value: 'ADMIN', label: 'Administrador', color: 'warning' as const },
  { value: 'ACCOUNTANT', label: 'Contador', color: 'info' as const },
  { value: 'VIEWER', label: 'Visualizador', color: 'default' as const },
];

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const canManageUsers =
    currentUser?.currentOrganization?.role === 'OWNER' ||
    currentUser?.currentOrganization?.role === 'ADMIN';

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'VIEWER',
      isActive: true,
    },
  });

  const passwordValue = watch('password');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showNotification('Usuário criado com sucesso!', 'success');
      handleCloseDialog();
    },
    onError: (error: unknown) => {
      const errorResponse = error as {
        response?: { data?: { message?: string } };
      };
      const message =
        errorResponse.response?.data?.message || 'Erro ao criar usuário';
      showNotification(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormData }) => {
      const payload = { ...data };
      // Remove password and confirmPassword if password is empty or not provided
      if (!payload.password || payload.password.trim() === '') {
        delete (payload as Partial<UserFormData>).password;
        delete (payload as Partial<UserFormData>).confirmPassword;
      }
      return api.patch(`/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showNotification('Usuário atualizado com sucesso!', 'success');
      handleCloseDialog();
    },
    onError: (error: unknown) => {
      const errorResponse = error as {
        response?: { data?: { message?: string } };
      };
      const message =
        errorResponse.response?.data?.message || 'Erro ao atualizar usuário';
      showNotification(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showNotification('Usuário excluído com sucesso!', 'success');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: unknown) => {
      const errorResponse = error as {
        response?: { data?: { message?: string } };
      };
      const message =
        errorResponse.response?.data?.message || 'Erro ao excluir usuário';
      showNotification(message, 'error');
    },
  });

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      reset({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setSelectedUser(null);
      reset({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'VIEWER',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    reset();
  };

  const onSubmit = (data: UserFormData) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data });
    } else {
      const createData: CreateUserData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      };
      createMutation.mutate(createData);
    }
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const getRoleChip = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role);
    return (
      <Chip
        label={roleConfig?.label || role}
        color={roleConfig?.color}
        size="small"
      />
    );
  };

  const canEditUser = (user: User) => {
    // Can't edit yourself
    if (user.id === currentUser?.id) return false;
    // OWNER can edit anyone
    if (currentUser?.currentOrganization?.role === 'OWNER') return true;
    // ADMIN can edit non-OWNER users
    if (
      currentUser?.currentOrganization?.role === 'ADMIN' &&
      user.role !== 'OWNER'
    )
      return true;
    return false;
  };

  const canDeleteUser = (user: User) => {
    // Can't delete yourself
    if (user.id === currentUser?.id) return false;
    // OWNER can delete anyone
    if (currentUser?.currentOrganization?.role === 'OWNER') return true;
    // ADMIN can delete non-OWNER and non-ADMIN users
    if (
      currentUser?.currentOrganization?.role === 'ADMIN' &&
      user.role !== 'OWNER' &&
      user.role !== 'ADMIN'
    )
      return true;
    return false;
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={7} align="center">
            Carregando...
          </TableCell>
        </TableRow>
      );
    }

    if (users.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} align="center">
            Nenhum usuário encontrado
          </TableCell>
        </TableRow>
      );
    }

    return users.map((user: User) => (
      <TableRow key={user.id} hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="action" />
            <Box>
              <Typography fontWeight="medium">{user.name}</Typography>
              {user.id === currentUser?.id && (
                <Typography variant="caption" color="primary">
                  (você)
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{getRoleChip(user.role)}</TableCell>
        <TableCell>
          <Chip
            label={user.isActive ? 'Ativo' : 'Inativo'}
            color={user.isActive ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          {user.lastLoginAt && user.lastLoginAt !== null
            ? new Date(user.lastLoginAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Nunca acessou'}
        </TableCell>
        <TableCell>{formatLocalDate(user.createdAt)}</TableCell>
        <TableCell align="right">
          <Tooltip
            title={canEditUser(user) ? 'Editar' : 'Sem permissão para editar'}
          >
            <span>
              <IconButton
                size="small"
                onClick={() => handleOpenDialog(user)}
                disabled={!canEditUser(user)}
              >
                <EditIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              canDeleteUser(user) ? 'Excluir' : 'Sem permissão para excluir'
            }
          >
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(user)}
                disabled={!canDeleteUser(user)}
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </TableCell>
      </TableRow>
    ));
  };

  if (!canManageUsers) {
    return (
      <Box>
        <PageHeader
          title="Usuários"
          subtitle="Você não tem permissão para gerenciar usuários"
        />
        <Alert severity="warning">
          Apenas proprietários e administradores podem gerenciar usuários.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie os usuários da organização"
        action={{ label: 'Novo Usuário', onClick: () => handleOpenDialog() }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Último Acesso</TableCell>
              <TableCell>Criado em</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nome"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="E-mail"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        selectedUser
                          ? 'Nova Senha (deixe em branco para manter)'
                          : 'Senha'
                      }
                      type="password"
                      fullWidth
                      error={!!errors.password}
                      helperText={errors.password?.message}
                    />
                  )}
                />
              </Grid>

              {passwordValue && passwordValue.length > 0 && (
                <Grid item xs={12}>
                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={
                          selectedUser
                            ? 'Confirmar Nova Senha'
                            : 'Confirmar Senha'
                        }
                        type="password"
                        fullWidth
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword?.message}
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role}>
                      <InputLabel>Perfil</InputLabel>
                      <Select {...field} label="Perfil">
                        {ROLES.filter(role => {
                          // Only OWNER can assign OWNER role
                          if (
                            role.value === 'OWNER' &&
                            currentUser?.currentOrganization?.role !== 'OWNER'
                          ) {
                            return false;
                          }
                          return true;
                        }).map(role => (
                          <MenuItem key={role.value} value={role.value}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Chip
                                label={role.label}
                                color={role.color}
                                size="small"
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Usuário ativo"
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Perfis disponíveis:</strong>
              </Typography>
              <Typography variant="body2">
                • <strong>Proprietário:</strong> Acesso total ao sistema
              </Typography>
              <Typography variant="body2">
                • <strong>Administrador:</strong> Gerencia usuários e dados
              </Typography>
              <Typography variant="body2">
                • <strong>Contador:</strong> Gerencia contas, pagamentos e
                categorias
              </Typography>
              <Typography variant="body2">
                • <strong>Visualizador:</strong> Apenas visualização
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseDialog}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
              startIcon={
                createMutation.isPending || updateMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : null
              }
            >
              {selectedUser ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir o usuário "${selectedUser?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedUser(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
};
