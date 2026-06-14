import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { api } from '@/lib/api';

interface SystemSettingsResponse {
  aiQueryChatEnabled: boolean;
}

interface SystemSettingsFormData {
  aiQueryChatEnabled: boolean;
}

export function AdminSystemSettingsPage() {
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<SystemSettingsFormData>({
    defaultValues: {
      aiQueryChatEnabled: false,
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async (): Promise<SystemSettingsResponse> => {
      const response = await api.get('/admin/system-settings');
      return response.data;
    },
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    reset({
      aiQueryChatEnabled: data.aiQueryChatEnabled,
    });
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: async (payload: SystemSettingsFormData) => {
      const response = await api.patch('/admin/system-settings', payload);
      return response.data as SystemSettingsResponse;
    },
    onSuccess: data => {
      reset(data);
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'features'] });
    },
  });

  const onSubmit = (formData: SystemSettingsFormData) => {
    mutation.mutate(formData);
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Configurações do Sistema
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Controle flags globais para liberar funcionalidades com segurança.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          {isLoading ? (
            <Typography color="text.secondary">
              Carregando configurações...
            </Typography>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                <Alert severity="info">
                  O chat analítico ficará oculto no app e o endpoint também será bloqueado
                  enquanto esta flag estiver desativada.
                </Alert>

                <Controller
                  name="aiQueryChatEnabled"
                  control={control}
                  render={({ field }) => (
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        borderColor: 'divider',
                      }}
                    >
                      <CardContent>
                        <FormControlLabel
                          sx={{ alignItems: 'flex-start', m: 0 }}
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(_, checked) => field.onChange(checked)}
                              sx={{ mt: 0.25, mr: 1 }}
                            />
                          }
                          label={
                            <Box>
                              <Typography fontWeight={700}>
                                Habilitar chat analítico
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Quando ativo, o chat fica disponível no produto. Quando inativo,
                                a funcionalidade permanece escondida e protegida até a
                                estabilização.
                              </Typography>
                            </Box>
                          }
                        />
                      </CardContent>
                    </Card>
                  )}
                />

                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!isDirty || mutation.isPending}
                  >
                    Salvar configuração
                  </Button>
                </Stack>
              </Stack>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
