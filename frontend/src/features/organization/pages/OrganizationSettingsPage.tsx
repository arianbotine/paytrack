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
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { PageHeader } from '@/shared/components/PageHeader';

const settingsSchema = z.object({
  notificationLeadDays: z.coerce.number().int().min(1).max(60),
  notificationPollingSeconds: z.coerce.number().int().min(15).max(300),
  showOverdueNotifications: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface OrganizationSettingsResponse {
  id: string;
  name: string;
  notificationLeadDays: number;
  notificationPollingSeconds: number;
  showOverdueNotifications: boolean;
}

export function OrganizationSettingsPage() {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();
  const role = useAuthStore(state => state.user?.currentOrganization?.role);

  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      notificationLeadDays: 7,
      notificationPollingSeconds: 60,
      showOverdueNotifications: true,
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: async (): Promise<OrganizationSettingsResponse> => {
      const response = await api.get('/organization');
      return response.data;
    },
  });

  useEffect(() => {
    if (!data) return;

    reset({
      notificationLeadDays: data.notificationLeadDays,
      notificationPollingSeconds: data.notificationPollingSeconds,
      showOverdueNotifications: data.showOverdueNotifications,
    });
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (payload: SettingsFormData) =>
      api.patch('/organization', payload),
    onSuccess: () => {
      showNotification('Configurações de notificação atualizadas!', 'success');
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Erro ao atualizar configurações de notificação';
      showNotification(message, 'error');
    },
  });

  const onSubmit = (formData: SettingsFormData) => {
    mutation.mutate(formData);
  };

  return (
    <Box>
      <PageHeader
        title="Configurações da Organização"
        subtitle="Defina como os alertas de contas a pagar e receber devem funcionar"
      />

      <Card sx={{ maxWidth: 760 }}>
        <CardContent>
          {!canEdit && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Seu perfil não possui permissão para alterar estas configurações.
            </Alert>
          )}

          {isLoading ? (
            <Typography color="text.secondary">
              Carregando configurações...
            </Typography>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                <Controller
                  name="notificationLeadDays"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Dias de antecedência"
                      inputProps={{ min: 1, max: 60 }}
                      error={!!errors.notificationLeadDays}
                      helperText={
                        errors.notificationLeadDays?.message ||
                        'Janela de aviso para contas próximas do vencimento (1 a 60 dias).'
                      }
                      disabled={!canEdit}
                      fullWidth
                    />
                  )}
                />

                <Controller
                  name="notificationPollingSeconds"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Intervalo de atualização (segundos)"
                      inputProps={{ min: 15, max: 300 }}
                      error={!!errors.notificationPollingSeconds}
                      helperText={
                        errors.notificationPollingSeconds?.message ||
                        'Frequência de atualização automática do centro de notificações (15 a 300s).'
                      }
                      disabled={!canEdit}
                      fullWidth
                    />
                  )}
                />

                <Controller
                  name="showOverdueNotifications"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(_, checked) => field.onChange(checked)}
                          disabled={!canEdit}
                        />
                      }
                      label="Incluir contas vencidas nos alertas"
                    />
                  )}
                />

                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!canEdit || mutation.isPending || !isDirty}
                  >
                    Salvar configurações
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
