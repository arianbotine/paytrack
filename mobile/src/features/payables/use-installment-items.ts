import { useQuery } from '@tanstack/react-query';
import { api, useAuthStore } from '@lib/index';
import type { InstallmentItemsResponse } from '@lib/types';

export function installmentItemsQueryKey(
  organizationId: string | undefined,
  payableId: string | undefined,
  installmentId: string | undefined
) {
  return [
    'payables',
    organizationId,
    payableId,
    'installments',
    installmentId,
    'items',
  ] as const;
}

export function useInstallmentItems(
  payableId?: string,
  installmentId?: string,
  enabled = true
) {
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useQuery({
    queryKey: installmentItemsQueryKey(
      organizationId,
      payableId,
      installmentId
    ),
    queryFn: async () => {
      const response = await api.get<InstallmentItemsResponse>(
        `/payables/${payableId}/installments/${installmentId}/items`
      );
      return response.data;
    },
    enabled: enabled && !!payableId && !!installmentId && !!organizationId,
    staleTime: 0,
  });
}
