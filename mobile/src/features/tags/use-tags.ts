import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api';
import { useAuthStore } from '@lib/auth-store';
import type { Tag, ListResponse } from '@lib/types';

export function useTags() {
  const { accessToken } = useAuthStore();
  return useQuery<ListResponse<Tag>>({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get<ListResponse<Tag>>('/tags');
      return res.data;
    },
    enabled: !!accessToken,
    staleTime: 60_000,
  });
}
