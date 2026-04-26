import { useQuery } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type { PayableDetail } from '@lib/types';

export function usePayable(id?: string) {
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useQuery({
    queryKey: ['payable', organizationId, id],
    queryFn: async () => {
      const response = await api.get<PayableDetail>(`/payables/${id}`);
      return response.data;
    },
    enabled: !!id && !!organizationId,
  });
}
