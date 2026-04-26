import { useQuery } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type { ReceivableDetail } from '@lib/types';

export function useReceivable(id?: string) {
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useQuery({
    queryKey: ['receivable', organizationId, id],
    queryFn: async () => {
      const response = await api.get<ReceivableDetail>(`/receivables/${id}`);
      return response.data;
    },
    enabled: !!id && !!organizationId,
  });
}
