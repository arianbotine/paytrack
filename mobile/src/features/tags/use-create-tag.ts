import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { Tag, CreateTagInput } from '@lib/types';

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation<Tag, Error, CreateTagInput>({
    mutationFn: async data => {
      const res = await api.post<Tag>('/tags', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
