import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  MenuItem,
} from '@mui/material';
import { Add, Link as LinkIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  isSystemAdmin: boolean;
  isActive: boolean;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface Organization {
  id: string;
  name: string;
}

const createUserSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
    confirmPassword: z.string().optional(),
  })
  .refine(
    data => {
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

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openAssociateDialog, setOpenAssociateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    formState: { errors: createErrors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  const passwordValue = watchCreate('password');
  const {
    register: registerAssociate,
    handleSubmit: handleSubmitAssociate,
    reset: resetAssociate,
  } = useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await api.get('/admin/users');
      return response.data as User[];
    },
    retry: 1,
    retryDelay: 1000,
  });

  const { data: organizations } = useQuery({
    queryKey: ['admin-organizations-list'],
    queryFn: async () => {
      const response = await api.get('/admin/organizations');
      return response.data as Organization[];
    },
    retry: 1,
    retryDelay: 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/admin/users', { ...data, role: 'VIEWER' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setOpenCreateDialog(false);
      resetCreate();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao criar usuário');
    },
  });

  const associateMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post(
        `/admin/users/${selectedUser?.id}/organizations/${data.organizationId}`,
        { role: data.role }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setOpenAssociateDialog(false);
      setSelectedUser(null);
      resetAssociate();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao associar usuário');
    },
  });

  const onSubmitCreate = (data: CreateUserFormData) => {
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...userData } = data;
    createMutation.mutate(userData);
  };

  const onSubmitAssociate = (data: any) => {
    associateMutation.mutate(data);
  };

  const handleOpenAssociate = (user: User) => {
    setSelectedUser(user);
    setOpenAssociateDialog(true);
    setError('');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          Usuários
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Novo Usuário
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Organizações</TableCell>
                <TableCell>Admin Sistema</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {users?.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.organizations.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {user.organizations.map(org => (
                          <Chip
                            key={org.id}
                            label={`${org.name} (${org.role})`}
                            size="small"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sem organização
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isSystemAdmin && (
                      <Chip label="Sim" color="error" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleOpenAssociate(user)}
                    >
                      Associar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create User Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmitCreate(onSubmitCreate)}>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Nome"
              margin="normal"
              required
              error={!!createErrors.name}
              helperText={createErrors.name?.message}
              {...registerCreate('name')}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              required
              error={!!createErrors.email}
              helperText={createErrors.email?.message}
              {...registerCreate('email')}
            />
            <TextField
              fullWidth
              label="Senha"
              type="password"
              margin="normal"
              required
              error={!!createErrors.password}
              helperText={createErrors.password?.message}
              {...registerCreate('password')}
            />
            {passwordValue && passwordValue.length > 0 && (
              <TextField
                fullWidth
                label="Confirmar Senha"
                type="password"
                margin="normal"
                required
                error={!!createErrors.confirmPassword}
                helperText={createErrors.confirmPassword?.message}
                {...registerCreate('confirmPassword')}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateDialog(false)}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
            >
              Criar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Associate User Dialog */}
      <Dialog
        open={openAssociateDialog}
        onClose={() => setOpenAssociateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmitAssociate(onSubmitAssociate)}>
          <DialogTitle>Associar Usuário a Organização</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {selectedUser && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Usuário: {selectedUser.name} ({selectedUser.email})
              </Typography>
            )}
            <TextField
              fullWidth
              select
              label="Organização"
              margin="normal"
              required
              {...registerAssociate('organizationId')}
            >
              {organizations?.map(org => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="Permissão"
              margin="normal"
              required
              defaultValue="VIEWER"
              {...registerAssociate('role')}
            >
              <MenuItem value="OWNER">OWNER</MenuItem>
              <MenuItem value="ADMIN">ADMIN</MenuItem>
              <MenuItem value="ACCOUNTANT">ACCOUNTANT</MenuItem>
              <MenuItem value="VIEWER">VIEWER</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAssociateDialog(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={associateMutation.isPending}
            >
              Associar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
