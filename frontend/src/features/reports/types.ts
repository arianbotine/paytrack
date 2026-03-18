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

export type PaymentsReportDetailType = 'payable' | 'receivable' | 'mixed';

export interface ReportTag {
  id: string;
  name: string;
  color: string | null;
}

export interface PaymentsReportDetailItem {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  type: PaymentsReportDetailType;
  vendorName: string | null;
  customerName: string | null;
  categoryName: string | null;
  reference: string | null;
  notes: string | null;
  tags: ReportTag[];
}

export interface PaymentsReportDetailsResponse {
  data: PaymentsReportDetailItem[];
  total: number;
}
