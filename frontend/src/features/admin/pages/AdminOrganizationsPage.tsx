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
import { api } from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  _count?: {
    users: number;
    payables: number;
    receivables: number;
  };
}

export function AdminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset } = useForm();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const response = await api.get('/admin/organizations');
      return response.data as Organization[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/admin/organizations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setOpenDialog(false);
      reset();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erro ao criar organização');
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
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
          onClick={() => setOpenDialog(true)}
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
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Nova Organização</DialogTitle>
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
              {...register('name')}
            />
            <TextField
              fullWidth
              label="CNPJ"
              margin="normal"
              {...register('document')}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              {...register('email')}
            />
            <TextField
              fullWidth
              label="Telefone"
              margin="normal"
              {...register('phone')}
            />
            <TextField
              fullWidth
              label="Endereço"
              margin="normal"
              multiline
              rows={2}
              {...register('address')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
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
    </Container>
  );
}
