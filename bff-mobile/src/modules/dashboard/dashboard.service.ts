import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';

interface BackendDashboardItem {
  id: string;
  amount: number;
  paidAmount?: number;
  receivedAmount?: number;
  vendor?: { id: string; name: string };
  customer?: { id: string; name: string };
  category?: { id: string; name: string; color?: string };
  tags: unknown[];
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
    }>;
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly httpClient: HttpClientService) {}

  /**
   * Get dashboard data from backend and transform for mobile.
   * Flattens nested structures and limits list sizes.
   */
  async getDashboard(accessToken: string): Promise<MobileDashboardResponse> {
    const data = await this.httpClient.get<BackendDashboardResponse>(
      '/dashboard',
      accessToken
    );

    // Transform for mobile: flatten and limit to 5 items per list
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
        overdueItems: data.payableInstallments.overdue
          .slice(0, 5)
          .map(item => this.mapPayableItem(item)),
        upcomingItems: data.payableInstallments.upcoming
          .slice(0, 5)
          .map(item => this.mapPayableItem(item)),
      },
      receivables: {
        pendingCount: data.receivableInstallments.totals.count,
        partialCount: data.receivableInstallments.totals.partial,
        totalToReceive: data.receivableInstallments.toReceive,
        overdueItems: data.receivableInstallments.overdue
          .slice(0, 5)
          .map(item => this.mapReceivableItem(item)),
        upcomingItems: data.receivableInstallments.upcoming
          .slice(0, 5)
          .map(item => this.mapReceivableItem(item)),
      },
    };
  }

  private mapPayableItem(item: BackendDashboardItem) {
    const nextAmount = parseFloat(item.nextUnpaidAmount ?? '0');
    // Use the installment id provided directly by the backend
    const nextInstallment =
      item.installments?.find(i => i.id === item.nextUnpaidInstallmentId) ??
      item.installments?.find(i =>
        i.dueDate?.startsWith(item.nextUnpaidDueDate ?? '')
      ) ??
      null;
    const paidAmount = nextInstallment?.paidAmount ?? 0;
    return {
      id: item.id,
      installmentId:
        item.nextUnpaidInstallmentId ?? nextInstallment?.id ?? null,
      dueDate: item.nextUnpaidDueDate,
      amount: nextAmount,
      paidAmount,
      remaining: nextAmount - paidAmount,
      vendorName: item.vendor?.name ?? null,
      categoryName: item.category?.name ?? null,
    };
  }

  private mapReceivableItem(item: BackendDashboardItem) {
    const nextAmount = parseFloat(item.nextUnpaidAmount ?? '0');
    // Use the installment id provided directly by the backend
    const nextInstallment =
      item.installments?.find(i => i.id === item.nextUnpaidInstallmentId) ??
      item.installments?.find(i =>
        i.dueDate?.startsWith(item.nextUnpaidDueDate ?? '')
      ) ??
      null;
    const paidAmount = nextInstallment?.receivedAmount ?? 0;
    return {
      id: item.id,
      installmentId:
        item.nextUnpaidInstallmentId ?? nextInstallment?.id ?? null,
      dueDate: item.nextUnpaidDueDate,
      amount: nextAmount,
      paidAmount,
      remaining: nextAmount - paidAmount,
      customerName: item.customer?.name ?? null,
      categoryName: item.category?.name ?? null,
    };
  }
}
