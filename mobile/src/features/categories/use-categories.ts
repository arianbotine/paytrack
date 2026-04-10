import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api';
import type {
  ListResponse,
  Category,
  CategoryType,
  CreateCategoryInput,
} from '@lib/types';
import { useAuthStore } from '@lib/auth-store';

export function useCategories(type: CategoryType) {
  const { accessToken } = useAuthStore();
  return useQuery<ListResponse<Category>>({
    queryKey: ['categories', type],
    queryFn: async () => {
      const res = await api.get<ListResponse<Category>>(
        `/categories?type=${type}`
      );
      return res.data;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, CreateCategoryInput>({
    mutationFn: async data => {
      const res = await api.post<Category>('/categories', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['categories', variables.type],
      });
    },
  });
}
