import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useUIStore } from "../../../lib/stores/uiStore";
import type {
  ReceivableFormData,
  ReceivablesResponse,
  Customer,
  Category,
  Tag,
} from "../types";

// ============================================================
// Query Keys
// ============================================================

export const receivableKeys = {
  all: ["receivables"] as const,
  lists: () => [...receivableKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...receivableKeys.lists(), filters] as const,
  details: () => [...receivableKeys.all, "detail"] as const,
  detail: (id: string) => [...receivableKeys.details(), id] as const,
};

// ============================================================
// Receivables Query
// ============================================================

interface UseReceivablesParams {
  status?: string;
  page: number;
  rowsPerPage: number;
}

export const useReceivables = ({
  status,
  page,
  rowsPerPage,
}: UseReceivablesParams) => {
  return useQuery({
    queryKey: receivableKeys.list({ status, page, rowsPerPage }),
    queryFn: async (): Promise<ReceivablesResponse> => {
      const params: Record<string, string | number> = {
        skip: page * rowsPerPage,
        take: rowsPerPage,
      };
      if (status && status !== "ALL") {
        params.status = status;
      }
      const response = await api.get("/receivables", { params });
      return response.data;
    },
  });
};

// ============================================================
// Related Data Queries
// ============================================================

export const useCustomers = () => {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async (): Promise<Customer[]> => {
      const response = await api.get("/customers");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useReceivableCategories = () => {
  return useQuery({
    queryKey: ["categories", "RECEIVABLE"],
    queryFn: async (): Promise<Category[]> => {
      const response = await api.get("/categories", {
        params: { type: "RECEIVABLE" },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTags = () => {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async (): Promise<Tag[]> => {
      const response = await api.get("/tags");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================
// Mutations
// ============================================================

export const useCreateReceivable = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: (data: ReceivableFormData) => api.post("/receivables", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a receber criada com sucesso!", "success");
      onSuccess?.();
    },
    onError: () => {
      showNotification("Erro ao criar conta a receber", "error");
    },
  });
};

export const useUpdateReceivable = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceivableFormData }) =>
      api.patch(`/receivables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a receber atualizada com sucesso!", "success");
      onSuccess?.();
    },
    onError: () => {
      showNotification("Erro ao atualizar conta a receber", "error");
    },
  });
};

export const useDeleteReceivable = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { showNotification } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/receivables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showNotification("Conta a receber excluída com sucesso!", "success");
      onSuccess?.();
    },
    onError: () => {
      showNotification("Erro ao excluir conta a receber", "error");
    },
  });
};

// ============================================================
// Combined Hook for All Receivable Operations
// ============================================================

export const useReceivableOperations = (callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}) => {
  const createMutation = useCreateReceivable(callbacks?.onCreateSuccess);
  const updateMutation = useUpdateReceivable(callbacks?.onUpdateSuccess);
  const deleteMutation = useDeleteReceivable(callbacks?.onDeleteSuccess);

  const submitReceivable = (
    data: ReceivableFormData,
    receivableId?: string
  ) => {
    const payload = {
      ...data,
      categoryId: data.categoryId || undefined,
      tagIds: data.tagIds?.length ? data.tagIds : undefined,
    };

    if (receivableId) {
      updateMutation.mutate({ id: receivableId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    submitReceivable,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
