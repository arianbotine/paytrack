import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, useAuthStore } from '../../lib';
import type { ReceivableListItem, ListResponse } from '../../lib/types';

const PAGE_SIZE = 15;

export type ReceivableStatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'PAID';

export interface ReceivableFilters {
  status: ReceivableStatusFilter;
  nextDueMonth: string | null;
  customerId: string | null;
}

export function useReceivables(filters: ReceivableFilters) {
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  const buildQueryParams = useCallback(
    (skip: number) => {
      const params = new URLSearchParams();
      if (filters.status !== 'ALL') params.set('status', filters.status);
      if (filters.nextDueMonth)
        params.set('nextDueMonth', filters.nextDueMonth);
      if (filters.customerId) params.set('customerId', filters.customerId);
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String(skip));
      return params.toString();
    },
    [filters.status, filters.nextDueMonth, filters.customerId]
  );

  return useInfiniteQuery<ListResponse<ReceivableListItem>>({
    queryKey: [
      'receivables',
      organizationId,
      filters.status,
      filters.nextDueMonth,
      filters.customerId,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get<ListResponse<ReceivableListItem>>(
        `/receivables?${buildQueryParams(pageParam as number)}`
      );
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!organizationId,
  });
}
