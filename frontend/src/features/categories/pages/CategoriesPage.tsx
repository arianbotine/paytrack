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
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalance as PayableIcon,
  RequestQuote as ReceivableIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useUIStore } from '../../../lib/stores/uiStore';

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['PAYABLE', 'RECEIVABLE']),
  color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type CategoryUpdateData = Omit<CategoryFormData, 'type'>;

interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  color?: string;
  createdAt: string;
  _count?: {
    payables: number;
    receivables: number;
  };
}

const COLORS = [
  '#1976d2',
  '#388e3c',
  '#f57c00',
  '#d32f2f',
  '#7b1fa2',
  '#0097a7',
  '#455a64',
  '#5d4037',
  '#c2185b',
  '#512da8',
];

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [typeFilter, setTypeFilter] = useState<
    'ALL' | 'PAYABLE' | 'RECEIVABLE'
  >('ALL');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'PAYABLE',
      color: COLORS[0],
    },
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', typeFilter],
    queryFn: async () => {
      const params = typeFilter === 'ALL' ? {} : { type: typeFilter };
      const response = await api.get('/categories', { params });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => api.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showNotification('Categoria criada com sucesso!', 'success');
      handleCloseDialog();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao criar categoria';
      showNotification(message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdateData }) =>
      api.patch(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showNotification('Categoria atualizada com sucesso!', 'success');
      handleCloseDialog();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao atualizar categoria';
      showNotification(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showNotification('Categoria excluída com sucesso!', 'success');
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao excluir categoria';
      showNotification(message, 'error');
    },
  });

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setSelectedCategory(category);
      reset({
        name: category.name,
        description: category.description || '',
        type: category.type,
        color: category.color || COLORS[0],
      });
    } else {
      setSelectedCategory(null);
      reset({
        name: '',
        description: '',
        type: 'PAYABLE',
        color: COLORS[0],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCategory(null);
    reset();
  };

  const onSubmit = (data: CategoryFormData) => {
    const formData = { ...data, name: data.name.toUpperCase() };
    if (selectedCategory) {
      // Remove 'type' from update payload as it cannot be changed
      const { type, ...updateData } = formData;
      updateMutation.mutate({
        id: selectedCategory.id,
        data: updateData as CategoryUpdateData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory.id);
    }
  };

  const getTypeChip = (type: 'PAYABLE' | 'RECEIVABLE') => {
    if (type === 'PAYABLE') {
      return (
        <Chip
          icon={<PayableIcon />}
          label="Contas a Pagar"
          color="error"
          size="small"
          variant="outlined"
        />
      );
    }
    return (
      <Chip
        icon={<ReceivableIcon />}
        label="Contas a Receber"
        color="success"
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      <PageHeader
        title="Categorias"
        subtitle="Organize suas contas por categorias"
        action={{ label: 'Nova Categoria', onClick: () => handleOpenDialog() }}
      />

      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={(_, value) => value && setTypeFilter(value)}
          size="small"
        >
          <ToggleButton value="ALL">Todas</ToggleButton>
          <ToggleButton value="PAYABLE">Contas a Pagar</ToggleButton>
          <ToggleButton value="RECEIVABLE">Contas a Receber</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cor</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Uso</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              if (isLoading) {
                return (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                );
              } else if (categories.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nenhuma categoria encontrada
                    </TableCell>
                  </TableRow>
                );
              } else {
                return categories.map((category: Category) => {
                  let usageText = '-';
                  if (category._count) {
                    if (category.type === 'PAYABLE') {
                      usageText = `${category._count.payables} contas`;
                    } else {
                      usageText = `${category._count.receivables} contas`;
                    }
                  }

                  return (
                    <TableRow key={category.id} hover>
                      <TableCell>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: category.color || COLORS[0],
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {category.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {category.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{getTypeChip(category.type)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {usageText}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(category)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            (category._count?.payables || 0) +
                              (category._count?.receivables || 0) >
                            0
                              ? 'Categoria não pode ser excluída pois está em uso'
                              : 'Excluir'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(category)}
                              disabled={
                                (category._count?.payables || 0) +
                                  (category._count?.receivables || 0) >
                                0
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                });
              }
            })()}
          </TableBody>
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
            {selectedCategory ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
            >
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

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descrição"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />

              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      {...field}
                      label="Tipo"
                      disabled={!!selectedCategory}
                    >
                      <MenuItem value="PAYABLE">Contas a Pagar</MenuItem>
                      <MenuItem value="RECEIVABLE">Contas a Receber</MenuItem>
                    </Select>
                    {selectedCategory && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        O tipo não pode ser alterado após a criação
                      </Typography>
                    )}
                  </FormControl>
                )}
              />

              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Cor
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {COLORS.map(color => (
                        <Box
                          key={color}
                          onClick={() => field.onChange(color)}
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: color,
                            cursor: 'pointer',
                            border:
                              field.value === color
                                ? '3px solid #000'
                                : '3px solid transparent',
                            '&:hover': {
                              transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              />
            </Box>
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
              {selectedCategory ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${selectedCategory?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedCategory(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
};
