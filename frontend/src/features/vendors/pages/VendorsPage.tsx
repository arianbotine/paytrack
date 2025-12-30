import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { PageHeader, ConfirmDialog } from '@/shared/components';

const vendorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface Vendor {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
}

export function VendorsPage() {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors?includeInactive=true');
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: VendorFormData) => api.post('/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: VendorFormData) =>
      api.patch(`/vendors/${editingVendor?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setDeleteId(null);
    },
  });

  const handleOpenForm = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      reset(vendor);
    } else {
      setEditingVendor(null);
      reset({
        name: '',
        document: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      });
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingVendor(null);
    reset();
  };

  const onSubmit = (data: VendorFormData) => {
    if (editingVendor) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Credores"
        subtitle="Gerencie os credores para vincular às contas a pagar"
        action={{ label: 'Novo Credor', onClick: () => handleOpenForm() }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Alert severity="info">Nenhum credor cadastrado</Alert>
                  </TableCell>
                </TableRow>
              )}
              {vendors?.map(vendor => (
                <TableRow key={vendor.id} hover>
                  <TableCell>{vendor.name}</TableCell>
                  <TableCell>{vendor.document || '-'}</TableCell>
                  <TableCell>{vendor.email || '-'}</TableCell>
                  <TableCell>{vendor.phone || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={vendor.isActive ? 'Ativo' : 'Inativo'}
                      color={vendor.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton
                        onClick={() => handleOpenForm(vendor)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        onClick={() => setDeleteId(vendor.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingVendor ? 'Editar Credor' : 'Novo Credor'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nome"
                fullWidth
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <TextField
                label="Documento (CPF/CNPJ)"
                fullWidth
                {...register('document')}
              />
              <TextField
                label="Email"
                fullWidth
                type="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField label="Telefone" fullWidth {...register('phone')} />
              <TextField label="Endereço" fullWidth {...register('address')} />
              <TextField
                label="Observações"
                fullWidth
                multiline
                rows={3}
                {...register('notes')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseForm}
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
              {editingVendor ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Excluir Credor"
        message="Tem certeza que deseja excluir este credor? Se houver contas vinculadas, ele será inativado."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
}
