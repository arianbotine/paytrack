import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import type { PaymentsReportResponse, ReportFilters } from '../types';

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

export const usePaymentsReport = (params: UsePaymentsReportParams) => {
  return useQuery<PaymentsReportResponse, Error, PaymentsReportResponse>({
    queryKey: ['reports', 'payments', params],
    queryFn: async (): Promise<PaymentsReportResponse> => {
      const { data } = await api.get<PaymentsReportResponse>(
        '/reports/payments',
        { params }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
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
