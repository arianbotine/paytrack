import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, useAuthStore } from '../../lib';
import type { PayableListItem, ListResponse } from '../../lib/types';

const PAGE_SIZE = 15;

export type PayableStatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'PAID';

export interface PayableFilters {
  status: PayableStatusFilter;
  nextDueMonth: string | null;
  vendorId: string | null;
}

export function usePayables(filters: PayableFilters) {
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  const buildQueryParams = useCallback(
    (skip: number) => {
      const params = new URLSearchParams();
      if (filters.status !== 'ALL') params.set('status', filters.status);
      if (filters.nextDueMonth)
        params.set('nextDueMonth', filters.nextDueMonth);
      if (filters.vendorId) params.set('vendorId', filters.vendorId);
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String(skip));
      return params.toString();
    },
    [filters.status, filters.nextDueMonth, filters.vendorId]
  );

  return useInfiniteQuery<ListResponse<PayableListItem>>({
    queryKey: [
      'payables',
      organizationId,
      filters.status,
      filters.nextDueMonth,
      filters.vendorId,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get<ListResponse<PayableListItem>>(
        `/payables?${buildQueryParams(pageParam as number)}`
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
