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

// ============================================================
// Installment Items Report
// ============================================================

export interface InstallmentItemTag {
  id: string;
  name: string;
  color: string | null;
}

export interface InstallmentItemReportRow {
  itemId: string;
  itemDescription: string;
  itemAmount: number;
  itemSortOrder: number;
  itemCreatedAt: string;
  itemSplitIndex: number | null;
  itemSplitTotal: number | null;
  itemCategoryId: string | null;
  itemCategoryName: string | null;
  tags: InstallmentItemTag[];
  installmentId: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentAmount: number;
  installmentDueDate: string;
  installmentStatus: string;
  installmentPaidAmount: number;
  installmentNotes: string | null;
  payableId: string;
  vendorName: string;
  categoryName: string | null;
  payableCreatedAt: string;
  payableNotes: string | null;
}

export interface InstallmentItemsReportSummary {
  totalItems: number;
  totalAmount: number;
  uniqueInstallments: number;
  uniquePayables: number;
}

export interface InstallmentItemsReportResponse {
  data: InstallmentItemReportRow[];
  total: number;
  summary: InstallmentItemsReportSummary;
}

export interface UseInstallmentItemsReportParams {
  tagIds?: string[];
  categoryIds?: string[];
  skip?: number;
  take?: number;
}

// ============================================================
// Installment Items Grouped by Description
// ============================================================

export interface InstallmentItemGroupedRow {
  description: string;
  totalAmount: number;
  itemCount: number;
  installmentCount: number;
  payableCount: number;
  tags: InstallmentItemTag[];
}

export interface InstallmentItemsGroupedSummary {
  totalAmount: number;
  uniqueDescriptions: number;
  uniqueInstallments: number;
  uniquePayables: number;
}

export interface InstallmentItemsGroupedResponse {
  data: InstallmentItemGroupedRow[];
  total: number;
  summary: InstallmentItemsGroupedSummary;
}

// ============================================================
// Installment Items Grouped by Tag
// ============================================================

export interface InstallmentItemTagGroupSummary {
  tagId: string;
  tagName: string;
  tagColor: string | null;
  totalAmount: number;
  itemCount: number;
  installmentCount: number;
  payableCount: number;
}

export interface InstallmentItemsGroupedByTagResponse {
  data: InstallmentItemTagGroupSummary[];
}
