export interface TimeSeriesData {
  period: string;
  payables: number;
  receivables: number;
  count: number;
}

export interface ComparisonData {
  current: number;
  previous: number;
  variance: number;
}

export interface ReportTotals {
  payables: ComparisonData;
  receivables: ComparisonData;
  netBalance: ComparisonData;
  transactions: ComparisonData;
}

export interface BreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface PaginatedBreakdown {
  data: BreakdownItem[];
  total: number;
}

export interface ReportBreakdown {
  byCategory: PaginatedBreakdown;
  byPaymentMethod: PaginatedBreakdown;
}

export interface PaymentsReportResponse {
  timeSeries: TimeSeriesData[];
  totals: ReportTotals;
  breakdown: ReportBreakdown;
}

export type ReportGroupBy = 'day' | 'week' | 'month';
export type ChartType = 'area' | 'bar';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  groupBy?: ReportGroupBy;
  categoryIds?: string[];
  tagIds?: string[];
  vendorIds?: string[];
  customerIds?: string[];
}
