import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useUIStore } from '../../lib/stores/uiStore';

interface QuickCreateCategoryProps {
  open: boolean;
  type: 'PAYABLE' | 'RECEIVABLE';
  onClose: () => void;
  onCreated: (category: any) => void;
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6366F1', // indigo
];

export const QuickCreateCategory: React.FC<QuickCreateCategoryProps> = ({
  open,
  type,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/categories', data),
    onSuccess: response => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showNotification('Categoria criada com sucesso!', 'success');
      onCreated(response.data);
      handleClose();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao criar categoria';
      showNotification(message, 'error');
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedColor(PRESET_COLORS[0]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      type,
      color: selectedColor,
      description: description.trim() || undefined,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="xs"
          fullWidth
          PaperProps={
            {
              component: motion.div,
              initial: { opacity: 0, scale: 0.9, y: -20 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.9, y: -20 },
              transition: { duration: 0.2 },
            } as any
          }
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pb: 1,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: theme =>
                    `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AddIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Nova Categoria
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {type === 'PAYABLE' ? 'Contas a Pagar' : 'Contas a Receber'}
                </Typography>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
              <TextField
                autoFocus
                label="Nome da categoria"
                fullWidth
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={createMutation.isPending}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Descrição (opcional)"
                fullWidth
                multiline
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={createMutation.isPending}
                sx={{ mb: 2 }}
              />

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Cor da categoria
                </Typography>
                <Grid container spacing={1}>
                  {PRESET_COLORS.map(color => (
                    <Grid item key={color}>
                      <Box
                        onClick={() => setSelectedColor(color)}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: color,
                          cursor: 'pointer',
                          border: 3,
                          borderColor:
                            selectedColor === color
                              ? 'primary.main'
                              : 'transparent',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            boxShadow: 2,
                          },
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={handleClose}
                disabled={createMutation.isPending}
                color="inherit"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!name.trim() || createMutation.isPending}
                startIcon={
                  createMutation.isPending ? (
                    <CircularProgress size={16} />
                  ) : (
                    <AddIcon />
                  )
                }
              >
                Criar Categoria
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
