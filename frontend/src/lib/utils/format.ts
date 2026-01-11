import type {
  ReportGroupBy,
  ReportFilters as ReportFiltersType,
} from '../../features/reports/types';

/**
 * Formata data para exibição nos gráficos baseado no groupBy
 */
export const formatChartDate = (
  isoDateString: string,
  groupBy: ReportGroupBy
): string => {
  const date = new Date(isoDateString);

  switch (groupBy) {
    case 'day':
      return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'short',
      }).format(date);

    case 'week': {
      // Calcular número da semana
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const diffMs = date.getTime() - startOfYear.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weekNum = Math.ceil((diffDays + startOfYear.getDay() + 1) / 7);
      return `Sem ${weekNum}/${date.getFullYear()}`;
    }

    case 'month':
      return new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
        year: '2-digit',
      }).format(date);

    default:
      return date.toLocaleDateString('pt-BR');
  }
};

/**
 * Formata valor monetário em real brasileiro
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata número de forma compacta (para eixos de gráficos)
 */
export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

/**
 * Formata timestamp relativo (ex: "há 2 min")
 */
export const formatRelativeTime = (isoDate: string): string => {
  const now = Date.now();
  const date = new Date(isoDate);
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    return 'Atualizado agora';
  } else if (diffMin < 60) {
    return `Atualizado há ${diffMin} min`;
  } else if (diffMin < 1440) {
    const hours = Math.floor(diffMin / 60);
    return `Atualizado há ${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffMin / 1440);
    return `Atualizado há ${days} dia${days > 1 ? 's' : ''}`;
  }
};

/**
 * Conta filtros ativos
 */
export const countActiveFilters = (filters: ReportFiltersType): number => {
  let count = 0;

  if (filters.categoryIds && filters.categoryIds.length > 0) count++;
  if (filters.tagIds && filters.tagIds.length > 0) count++;
  if (filters.vendorIds && filters.vendorIds.length > 0) count++;
  if (filters.customerIds && filters.customerIds.length > 0) count++;

  return count;
};
