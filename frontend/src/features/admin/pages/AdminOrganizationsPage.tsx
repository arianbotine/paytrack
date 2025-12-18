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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import { Add, Edit, Visibility } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';

const getDialogTitle = (viewingOrg: boolean, editingOrg: boolean) => {
  if (viewingOrg) return 'Visualizar Organização';
  if (editingOrg) return 'Editar Organização';
  return 'Nova Organização';
};

const organizationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface Organization {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  _count?: {
    users: number;
    payables: number;
    receivables: number;
  };
}

export function AdminOrganizationsPage() {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const response = await api.get('/admin/organizations');
      return response.data as Organization[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      return api.post('/admin/organizations', data);
    },
    onSuccess: async () => {
      // Atualizar lista de organizações no admin
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });

      // Buscar informações atualizadas do usuário para atualizar availableOrganizations
      try {
        const response = await api.get('/auth/me');
        const currentAccessToken = useAuthStore.getState().accessToken;
        if (currentAccessToken) {
          setAuth(response.data, currentAccessToken);
        }
      } catch (error) {
        console.error('Erro ao atualizar informações do usuário:', error);
      }

      handleCloseDialog();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao criar organização');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: OrganizationFormData;
    }) => {
      return api.patch(`/admin/organizations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      handleCloseDialog();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao atualizar organização');
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingOrg(null);
    setViewingOrg(null);
    reset({
      name: '',
      document: '',
      email: '',
      phone: '',
      address: '',
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (org: Organization) => {
    setEditingOrg(org);
    setViewingOrg(null);
    reset({
      name: org.name,
      document: org.document || '',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
    });
    setOpenDialog(true);
  };

  const handleOpenViewDialog = (org: Organization) => {
    setViewingOrg(org);
    setEditingOrg(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOrg(null);
    setViewingOrg(null);
    reset();
    setError('');
  };

  const onSubmit = (data: OrganizationFormData) => {
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data });
    } else {
      createMutation.mutate(data);
    }
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
          Organizações
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreateDialog}
        >
          Nova Organização
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Usuários</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {organizations?.map(org => (
                <TableRow key={org.id}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{org.document || '-'}</TableCell>
                  <TableCell>{org.email || '-'}</TableCell>
                  <TableCell>{org._count?.users || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={org.isActive ? 'Ativa' : 'Inativa'}
                      color={org.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenViewDialog(org)}
                      title="Visualizar"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditDialog(org)}
                      title="Editar"
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Organization Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {getDialogTitle(!!viewingOrg, !!editingOrg)}
          </DialogTitle>
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
              disabled={!!viewingOrg}
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              fullWidth
              label="CNPJ"
              margin="normal"
              disabled={!!viewingOrg}
              error={!!errors.document}
              helperText={errors.document?.message}
              {...register('document')}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              disabled={!!viewingOrg}
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <TextField
              fullWidth
              label="Telefone"
              margin="normal"
              disabled={!!viewingOrg}
              error={!!errors.phone}
              helperText={errors.phone?.message}
              {...register('phone')}
            />
            <TextField
              fullWidth
              label="Endereço"
              margin="normal"
              multiline
              rows={2}
              disabled={!!viewingOrg}
              error={!!errors.address}
              helperText={errors.address?.message}
              {...register('address')}
            />
            {viewingOrg && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Estatísticas:
                </Typography>
                <Typography variant="body2">
                  • Usuários: {viewingOrg._count?.users || 0}
                </Typography>
                <Typography variant="body2">
                  • Contas a Pagar: {viewingOrg._count?.payables || 0}
                </Typography>
                <Typography variant="body2">
                  • Contas a Receber: {viewingOrg._count?.receivables || 0}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Fechar</Button>
            {!viewingOrg && (
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingOrg ? 'Salvar' : 'Criar'}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
