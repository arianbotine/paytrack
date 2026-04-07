import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { ListResponse, Vendor, CreateVendorInput } from '@lib/types';
import { useAuthStore } from '@lib/auth-store';

export function useVendors(search?: string) {
  const { accessToken } = useAuthStore();
  return useQuery<ListResponse<Vendor>>({
    queryKey: ['vendors', search ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams({ take: '30' });
      if (search) params.set('search', search);
      const res = await api.get<ListResponse<Vendor>>(
        `/vendors?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!accessToken,
    staleTime: 60_000,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation<Vendor, Error, CreateVendorInput>({
    mutationFn: async data => {
      const res = await api.post<Vendor>('/vendors', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}
