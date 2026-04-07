import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';
import type { ListResponse, Customer, CreateCustomerInput } from '@lib/types';
import { useAuthStore } from '@lib/auth-store';

export function useCustomers(search?: string) {
  const { accessToken } = useAuthStore();
  return useQuery<ListResponse<Customer>>({
    queryKey: ['customers', search ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams({ take: '30' });
      if (search) params.set('search', search);
      const res = await api.get<ListResponse<Customer>>(
        `/customers?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!accessToken,
    staleTime: 60_000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation<Customer, Error, CreateCustomerInput>({
    mutationFn: async data => {
      const res = await api.post<Customer>('/customers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
