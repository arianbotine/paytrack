/**
 * Utilitário para calcular períodos de datas para relatórios
 */

export type PeriodShortcut =
  | 'last7'
  | 'last15'
  | 'last30'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth';

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Calcula o intervalo de datas para um período predefinido
 */
export function calculateDateRange(period: PeriodShortcut): DateRange {
  const today = new Date();
  const start = new Date();

  switch (period) {
    case 'thisWeek': {
      start.setDate(today.getDate() - today.getDay());
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
    case 'lastWeek': {
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      return {
        startDate: lastWeekStart.toISOString().split('T')[0],
        endDate: lastWeekEnd.toISOString().split('T')[0],
      };
    }
    case 'thisMonth': {
      start.setDate(1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
    case 'lastMonth': {
      const lastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0],
      };
    }
    case 'last7': {
      start.setDate(today.getDate() - 7);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
    case 'last15': {
      start.setDate(today.getDate() - 15);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
    case 'last30':
    default: {
      start.setDate(today.getDate() - 30);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
  }
}

/**
 * Formata um resumo do período selecionado
 */
export function getPeriodSummary(
  startDate: string,
  endDate: string
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: start.getFullYear() === end.getFullYear() ? undefined : 'numeric',
    });
  };

  return `${formatDate(start)} até ${formatDate(end)} (${diffDays} ${diffDays === 1 ? 'dia' : 'dias'})`;
}
