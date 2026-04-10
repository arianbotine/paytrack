import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';

function flattenTags(
  tags?: Array<
    | { id: string; name: string; color?: string | null }
    | { tag: { id: string; name: string; color?: string | null } }
  >
): Array<{ id: string; name: string; color: string }> {
  if (!tags) return [];
  return tags.map(t => {
    if ('tag' in t)
      return {
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color ?? '#3B82F6',
      };
    return { id: t.id, name: t.name, color: t.color ?? '#3B82F6' };
  });
}

interface BackendNotificationItem {
  notificationId: string;
  accountType: 'PAYABLE' | 'RECEIVABLE';
  installmentId: string;
  accountId: string;
  counterpartyName: string;
  categoryName: string | null;
  tags: Array<{ id: string; name: string; color?: string | null }>;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  pendingAmount: number;
  amount: number;
  paidAmount: number | null;
  receivedAmount: number | null;
  installmentNumber: number;
  totalInstallments: number;
  status: string;
}

interface BackendNotificationsResponse {
  data: BackendNotificationItem[];
  total: number;
  settings: {
    notificationLeadDays: number;
    notificationPollingSeconds: number;
    showOverdueNotifications: boolean;
  };
}

interface BackendDashboardItem {
  id: string;
  amount: number;
  paidAmount?: number;
  receivedAmount?: number;
  vendor?: { id: string; name: string };
  customer?: { id: string; name: string };
  category?: { id: string; name: string; color?: string };
  tags?: Array<
    | { id: string; name: string; color?: string }
    | { tag: { id: string; name: string; color?: string } }
  >;
  installments: Array<{
    id: string;
    dueDate: string;
    amount: number;
    /** payable installments use paidAmount */
    paidAmount?: number;
    /** receivable installments use receivedAmount */
    receivedAmount?: number;
  }>;
  nextUnpaidDueDate: string | null;
  nextUnpaidAmount: string | null;
  nextUnpaidInstallmentId: string | null;
}

interface BackendDashboardResponse {
  payableInstallments: {
    totals: {
      total: number;
      paid: number;
      pending: number;
      partial: number;
      overdue: number;
      count: number;
    };
    toPay: number;
    overdue: BackendDashboardItem[];
    upcoming: BackendDashboardItem[];
  };
  receivableInstallments: {
    totals: {
      total: number;
      paid: number;
      pending: number;
      partial: number;
      overdue: number;
      count: number;
    };
    toReceive: number;
    overdue: BackendDashboardItem[];
    upcoming: BackendDashboardItem[];
  };
  balance: {
    toReceive: number;
    toPay: number;
    net: number;
  };
  paidInPeriod: number;
  receivedInPeriod: number;
}

export interface MobileDashboardResponse {
  balance: {
    toReceive: number;
    toPay: number;
    net: number;
  };
  monthSummary: {
    toPayThisMonth: number;
    toReceiveThisMonth: number;
    paidThisMonth: number;
    receivedThisMonth: number;
  };
  payables: {
    pendingCount: number;
    partialCount: number;
    totalToPay: number;
    overdueItems: Array<{
      id: string;
      installmentId: string | null;
      dueDate: string | null;
      amount: number;
      paidAmount: number;
      remaining: number;
      vendorName: string | null;
      categoryName: string | null;
      tags: Array<{ id: string; name: string; color: string }>;
    }>;
    upcomingItems: Array<{
      id: string;
      installmentId: string | null;
      dueDate: string | null;
      amount: number;
      paidAmount: number;
      remaining: number;
      vendorName: string | null;
      categoryName: string | null;
      tags: Array<{ id: string; name: string; color: string }>;
    }>;
  };
  receivables: {
    pendingCount: number;
    partialCount: number;
    totalToReceive: number;
    overdueItems: Array<{
      id: string;
      installmentId: string | null;
      dueDate: string | null;
      amount: number;
      paidAmount: number;
      remaining: number;
      customerName: string | null;
      categoryName: string | null;
      tags: Array<{ id: string; name: string; color: string }>;
    }>;
    upcomingItems: Array<{
      id: string;
      installmentId: string | null;
      dueDate: string | null;
      amount: number;
      paidAmount: number;
      remaining: number;
      customerName: string | null;
      categoryName: string | null;
      tags: Array<{ id: string; name: string; color: string }>;
    }>;
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly httpClient: HttpClientService) {}

  /**
   * Get dashboard data from backend and transform for mobile.
   * Summary numbers come from /dashboard; overdue and upcoming items come from
   * /notifications/due-alerts so that all records are returned respecting the
   * organization's notificationLeadDays setting (same as the web app).
   */
  async getDashboard(accessToken: string): Promise<MobileDashboardResponse> {
    const [data, notifications] = await Promise.all([
      this.httpClient.get<BackendDashboardResponse>('/dashboard', accessToken),
      this.httpClient.get<BackendNotificationsResponse>(
        '/notifications/due-alerts?limit=200',
        accessToken
      ),
    ]);

    const sort = (a: BackendNotificationItem, b: BackendNotificationItem) =>
      (a.dueDate ?? '').localeCompare(b.dueDate ?? '');

    const payableOverdue = notifications.data
      .filter(n => n.accountType === 'PAYABLE' && n.isOverdue)
      .sort(sort)
      .map(n => this.mapNotificationToPayableItem(n));

    const payableUpcoming = notifications.data
      .filter(n => n.accountType === 'PAYABLE' && !n.isOverdue)
      .sort(sort)
      .map(n => this.mapNotificationToPayableItem(n));

    const receivableOverdue = notifications.data
      .filter(n => n.accountType === 'RECEIVABLE' && n.isOverdue)
      .sort(sort)
      .map(n => this.mapNotificationToReceivableItem(n));

    const receivableUpcoming = notifications.data
      .filter(n => n.accountType === 'RECEIVABLE' && !n.isOverdue)
      .sort(sort)
      .map(n => this.mapNotificationToReceivableItem(n));

    return {
      balance: data.balance,
      monthSummary: {
        toPayThisMonth: data.payableInstallments.toPay,
        toReceiveThisMonth: data.receivableInstallments.toReceive,
        paidThisMonth: data.paidInPeriod,
        receivedThisMonth: data.receivedInPeriod,
      },
      payables: {
        pendingCount: data.payableInstallments.totals.count,
        partialCount: data.payableInstallments.totals.partial,
        totalToPay: data.payableInstallments.toPay,
        overdueItems: payableOverdue,
        upcomingItems: payableUpcoming,
      },
      receivables: {
        pendingCount: data.receivableInstallments.totals.count,
        partialCount: data.receivableInstallments.totals.partial,
        totalToReceive: data.receivableInstallments.toReceive,
        overdueItems: receivableOverdue,
        upcomingItems: receivableUpcoming,
      },
    };
  }

  private mapNotificationToPayableItem(n: BackendNotificationItem) {
    return {
      id: n.accountId,
      installmentId: n.installmentId,
      dueDate: n.dueDate,
      amount: n.amount,
      paidAmount: n.paidAmount ?? 0,
      remaining: n.pendingAmount,
      vendorName: n.counterpartyName,
      categoryName: n.categoryName,
      tags: flattenTags(n.tags),
    };
  }

  private mapNotificationToReceivableItem(n: BackendNotificationItem) {
    return {
      id: n.accountId,
      installmentId: n.installmentId,
      dueDate: n.dueDate,
      amount: n.amount,
      paidAmount: n.receivedAmount ?? 0,
      remaining: n.pendingAmount,
      customerName: n.counterpartyName,
      categoryName: n.categoryName,
      tags: flattenTags(n.tags),
    };
  }
}
