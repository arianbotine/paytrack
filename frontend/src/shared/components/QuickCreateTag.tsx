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
import { Add as AddIcon, LocalOffer as TagIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useUIStore } from '../../lib/stores/uiStore';

interface QuickCreateTagProps {
  open: boolean;
  onClose: () => void;
  onCreated: (tag: any) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export const QuickCreateTag: React.FC<QuickCreateTagProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tags', data),
    onSuccess: response => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      showNotification('Tag criada com sucesso!', 'success');
      onCreated(response.data);
      handleClose();
    },
    onError: () => {
      showNotification('Erro ao criar tag', 'error');
    },
  });

  const handleClose = () => {
    setName('');
    setSelectedColor(PRESET_COLORS[0]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      color: selectedColor,
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
                    `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TagIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Nova Tag
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Organize suas contas
                </Typography>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
              <TextField
                autoFocus
                label="Nome da tag"
                fullWidth
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={createMutation.isPending}
                sx={{ mb: 3 }}
                placeholder="Ex: Urgente, Mensal, Recorrente..."
              />

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Cor da tag
                </Typography>
                <Grid container spacing={1}>
                  {PRESET_COLORS.map(color => (
                    <Grid item key={color}>
                      <Box
                        onClick={() => setSelectedColor(color)}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '8px',
                          backgroundColor: color,
                          cursor: 'pointer',
                          border: 3,
                          borderColor:
                            selectedColor === color
                              ? 'primary.main'
                              : 'transparent',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            boxShadow: 2,
                          },
                        }}
                      >
                        {selectedColor === color && (
                          <TagIcon sx={{ color: 'white', fontSize: 18 }} />
                        )}
                      </Box>
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
                Criar Tag
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
