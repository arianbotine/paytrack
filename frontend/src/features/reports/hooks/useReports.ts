import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import type {
  PaymentsReportResponse,
  PaymentsReportDetailsResponse,
  ReportFilters,
  InstallmentItemsReportResponse,
  UseInstallmentItemsReportParams,
} from '../types';

interface UsePaymentsReportParams extends ReportFilters {
  skip?: number;
  take?: number;
}

interface Category {
  id: string;
  name: string;
  type: 'PAYABLE' | 'RECEIVABLE';
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

/**
 * Converte uma data local (YYYY-MM-DD) para UTC ISO representando o início do dia
 * no fuso horário do navegador do usuário.
 */
function localDateToUTCStartOfDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toISOString();
}

/**
 * Converte uma data local (YYYY-MM-DD) para UTC ISO representando o fim do dia
 * no fuso horário do navegador do usuário.
 */
function localDateToUTCEndOfDay(dateStr: string): string {
  return new Date(dateStr + 'T23:59:59.999').toISOString();
}

/**
 * Converte os filtros de data local para UTC antes de enviar ao backend.
 * O backend não conhece o fuso do usuário, portanto deve receber UTC.
 */
function toUTCDateParams(
  params: UsePaymentsReportParams
): UsePaymentsReportParams {
  return {
    ...params,
    startDate: params.startDate
      ? localDateToUTCStartOfDay(params.startDate)
      : params.startDate,
    endDate: params.endDate
      ? localDateToUTCEndOfDay(params.endDate)
      : params.endDate,
  };
}

export const usePaymentsReport = (params: UsePaymentsReportParams) => {
  return useQuery<PaymentsReportResponse, Error, PaymentsReportResponse>({
    queryKey: ['reports', 'payments', params],
    queryFn: async (): Promise<PaymentsReportResponse> => {
      const { data } = await api.get<PaymentsReportResponse>(
        '/reports/payments',
        { params: toUTCDateParams(params) }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const usePaymentsReportDetails = (
  params: UsePaymentsReportParams,
  enabled = true
) => {
  return useQuery<
    PaymentsReportDetailsResponse,
    Error,
    PaymentsReportDetailsResponse
  >({
    queryKey: ['reports', 'payments', 'details', params],
    queryFn: async (): Promise<PaymentsReportDetailsResponse> => {
      const { data } = await api.get<PaymentsReportDetailsResponse>(
        '/reports/payments/details',
        { params: toUTCDateParams(params) }
      );
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ============================================================
// Related Data Queries for Filters
// ============================================================

export const useReportCategories = () => {
  return useQuery<Category[], Error, Category[]>({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data } = await api.get<Category[]>('/categories');
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useReportTags = () => {
  return useQuery<Tag[], Error, Tag[]>({
    queryKey: ['tags'],
    queryFn: async (): Promise<Tag[]> => {
      const { data } = await api.get<Tag[]>('/tags');
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useReportVendors = () => {
  return useQuery<Vendor[], Error, Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async (): Promise<Vendor[]> => {
      const { data } = await api.get<Vendor[]>('/vendors');
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useReportCustomers = () => {
  return useQuery<Customer[], Error, Customer[]>({
    queryKey: ['customers'],
    queryFn: async (): Promise<Customer[]> => {
      const { data } = await api.get<Customer[]>('/customers');
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useInstallmentItemsReport = (
  params: UseInstallmentItemsReportParams,
  enabled = true
) => {
  return useQuery<
    InstallmentItemsReportResponse,
    Error,
    InstallmentItemsReportResponse
  >({
    queryKey: ['reports', 'installment-items', params],
    queryFn: async (): Promise<InstallmentItemsReportResponse> => {
      const { data } = await api.get<InstallmentItemsReportResponse>(
        '/reports/installment-items',
        {
          params: {
            tagIds: params.tagIds.join(','),
            skip: params.skip ?? 0,
            take: params.take ?? 50,
          },
        }
      );
      return data;
    },
    enabled: enabled && params.tagIds.length > 0,
    staleTime: 0,
    gcTime: 0,
  });
};
