import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { CreatePayableInput } from '@lib/types';

export function useCreatePayable() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, CreatePayableInput>({
    mutationFn: async data => {
      const res = await api.post<{ id: string }>('/payables', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
