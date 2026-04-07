import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { CreateReceivableInput } from '@lib/types';

export function useCreateReceivable() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, CreateReceivableInput>({
    mutationFn: async data => {
      const res = await api.post<{ id: string }>('/receivables', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
