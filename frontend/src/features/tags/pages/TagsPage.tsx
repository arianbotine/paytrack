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
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useUIStore } from '../../../lib/stores/uiStore';

const tagSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  color: z.string().optional(),
});

type TagFormData = z.infer<typeof tagSchema>;

interface Tag {
  id: string;
  name: string;
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
  '#00796b',
  '#8d6e63',
  '#78909c',
  '#ff5722',
  '#607d8b',
];

export const TagsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      color: COLORS[0],
    },
  });

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TagFormData) => api.post('/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      showNotification('Tag criada com sucesso!', 'success');
      handleCloseDialog();
    },
    onError: () => {
      showNotification('Erro ao criar tag', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TagFormData }) =>
      api.patch(`/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      showNotification('Tag atualizada com sucesso!', 'success');
      handleCloseDialog();
    },
    onError: () => {
      showNotification('Erro ao atualizar tag', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      showNotification('Tag excluída com sucesso!', 'success');
      setDeleteDialogOpen(false);
      setSelectedTag(null);
    },
    onError: () => {
      showNotification('Erro ao excluir tag', 'error');
    },
  });

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setSelectedTag(tag);
      reset({
        name: tag.name,
        color: tag.color || COLORS[0],
      });
    } else {
      setSelectedTag(null);
      reset({
        name: '',
        color: COLORS[0],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTag(null);
    reset();
  };

  const onSubmit = (data: TagFormData) => {
    const formData = { ...data, name: data.name.toUpperCase() };
    if (selectedTag) {
      updateMutation.mutate({ id: selectedTag.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTag) {
      deleteMutation.mutate(selectedTag.id);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Tags"
        subtitle="Crie tags para organizar suas contas"
        action={{ label: 'Nova Tag', onClick: () => handleOpenDialog() }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cor</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Uso em Contas a Pagar</TableCell>
              <TableCell>Uso em Contas a Receber</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              if (isLoading) {
                return (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                );
              } else if (tags.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhuma tag encontrada
                    </TableCell>
                  </TableRow>
                );
              } else {
                return tags.map((tag: Tag) => (
                  <TableRow key={tag.id} hover>
                    <TableCell>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '4px',
                          backgroundColor: tag.color || COLORS[0],
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">{tag.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {tag._count?.payables || 0} contas
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {tag._count?.receivables || 0} contas
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(tag)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          (tag._count?.payables || 0) +
                            (tag._count?.receivables || 0) >
                          0
                            ? 'Tag não pode ser excluída pois está em uso'
                            : 'Excluir'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(tag)}
                            disabled={
                              (tag._count?.payables || 0) +
                                (tag._count?.receivables || 0) >
                              0
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ));
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
          <DialogTitle>{selectedTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
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
                            borderRadius: '4px',
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
              {selectedTag ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Tag"
        message={`Tem certeza que deseja excluir a tag "${selectedTag?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedTag(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
};
