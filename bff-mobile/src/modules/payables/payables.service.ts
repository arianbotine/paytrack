import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HttpClientService } from '../../infrastructure/http-client.service';
import {
  PayableFilterDto,
  QuickPayDto,
  CreatePayableBffDto,
} from './payables.dto';

/**
 * Backend returns tags as join-table objects: { tag: {id, name, color} }
 * or sometimes flat: { id, name }. Normalize to flat { id, name }.
 */
function flattenTags(
  tags?: Array<
    | { id: string; name: string; color?: string }
    | { tag: { id: string; name: string; color?: string } }
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

interface BackendPayable {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: string; name: string };
  category?: { id: string; name: string; color?: string };
  tags?: Array<
    | { id: string; name: string }
    | { tag: { id: string; name: string; color?: string } }
  >;
  installments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    remaining?: number | null;
    status: string;
    notes?: string;
  }>;
}

export interface MobilePayableListItem {
  id: string;
  amount: number;
  status: string;
  vendorName: string | null;
  categoryName: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  nextInstallmentId: string | null;
  installmentsCount: number;
  paidInstallments: number;
}

export interface MobilePayableDetail {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  vendor: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  tags: Array<{ id: string; name: string }>;
  installments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    remaining: number;
    status: string;
    notes: string | null;
  }>;
}

/**
 * Build N monthly due dates starting from firstDueDate.
 * Preserves the day-of-month clamped to valid range for each month.
 */
function buildMonthlyDueDates(firstDueDate: string, count: number): string[] {
  const [y, m, d] = firstDueDate.split('-').map(Number);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const month = m - 1 + i;
    const year = y + Math.floor(month / 12);
    const monthInYear = month % 12;
    const maxDay = new Date(year, monthInYear + 1, 0).getDate();
    const day = Math.min(d, maxDay);
    dates.push(
      `${year}-${String(monthInYear + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
  }
  return dates;
}

@Injectable()
export class PayablesService {
  constructor(private readonly httpClient: HttpClientService) {}

  /**
   * List payables with mobile-optimized response.
   */
  async findAll(
    accessToken: string,
    filters: PayableFilterDto
  ): Promise<{ items: MobilePayableListItem[]; total: number }> {
    // Build query string
    const params = new URLSearchParams();
    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      statuses.forEach(s => params.append('status', s));
    }
    if (filters.vendorId) params.set('vendorId', filters.vendorId);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.dueDateFrom)
      params.set('installmentDueDateFrom', filters.dueDateFrom);
    if (filters.dueDateTo)
      params.set('installmentDueDateTo', filters.dueDateTo);

    // Mobile defaults: smaller page size
    params.set('take', String(filters.take || 15));
    params.set('skip', String(filters.skip || 0));

    const url = `/payables?${params.toString()}`;
    const response = await this.httpClient.get<
      { data: BackendPayable[]; total: number } | BackendPayable[]
    >(url, accessToken);

    // Backend returns { data, total } from paginated endpoint
    const list = Array.isArray(response) ? response : response.data;
    const total = Array.isArray(response) ? response.length : response.total;

    // Transform for mobile
    const items = list.map(payable => this.transformToListItem(payable));

    return { items, total };
  }

  /**
   * Get single payable detail.
   */
  async findOne(accessToken: string, id: string): Promise<MobilePayableDetail> {
    const data = await this.httpClient.get<BackendPayable>(
      `/payables/${id}`,
      accessToken
    );
    return this.transformToDetail(data);
  }

  /**
   * Quick pay - register payment for a payable installment.
   */
  async quickPay(
    accessToken: string,
    _payableId: string,
    installmentId: string,
    dto: QuickPayDto
  ) {
    // Use the backend's quick payment endpoint
    const payload = {
      type: 'payable',
      installmentId,
      amount: dto.amount,
      paymentDate: dto.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: dto.paymentMethod,
      reference: dto.reference,
      notes: dto.notes,
    };

    return this.httpClient.post('/payments/quick', payload, accessToken, {
      headers: { 'idempotency-key': randomUUID() },
    });
  }

  /**
   * Create a new payable. Receives firstDueDate + installmentCount and
   * auto-calculates the monthly due dates array required by the backend.
   */
  async create(
    accessToken: string,
    dto: CreatePayableBffDto
  ): Promise<{ id: string }> {
    const count = dto.installmentCount ?? 1;
    const dueDates = buildMonthlyDueDates(dto.firstDueDate, count);

    const payload: Record<string, unknown> = {
      vendorId: dto.vendorId,
      amount: dto.amount,
      installmentCount: count,
      dueDates,
    };
    if (dto.categoryId) payload.categoryId = dto.categoryId;
    if (dto.notes) payload.notes = dto.notes;
    if (dto.tagIds && dto.tagIds.length > 0) payload.tagIds = dto.tagIds;

    return this.httpClient.post<{ id: string }>(
      '/payables',
      payload,
      accessToken,
      { headers: { 'idempotency-key': randomUUID() } }
    );
  }

  /**
   * Get payment history for a payable.
   */
  async getPayments(accessToken: string, id: string) {
    return this.httpClient.get(`/payables/${id}/payments`, accessToken);
  }

  private transformToListItem(payable: BackendPayable): MobilePayableListItem {
    // Find the next pending/partial installment
    const pendingInstallments = payable.installments
      .filter(i => i.status !== 'PAID')
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    const nextInstallment = pendingInstallments[0];
    const paidCount = payable.installments.filter(
      i => i.status === 'PAID'
    ).length;

    return {
      id: payable.id,
      amount: payable.amount,
      status: payable.status,
      vendorName: payable.vendor?.name || null,
      categoryName: payable.category?.name || null,
      tags: flattenTags(payable.tags),
      nextDueDate: nextInstallment?.dueDate
        ? nextInstallment.dueDate.split('T')[0]
        : null,
      nextDueAmount: nextInstallment
        ? nextInstallment.amount - nextInstallment.paidAmount
        : null,
      nextInstallmentId: nextInstallment?.id ?? null,
      installmentsCount: payable.installments.length,
      paidInstallments: paidCount,
    };
  }

  private transformToDetail(payable: BackendPayable): MobilePayableDetail {
    return {
      id: payable.id,
      amount: payable.amount,
      status: payable.status,
      createdAt: payable.createdAt,
      vendor: payable.vendor || null,
      category: payable.category || null,
      tags: flattenTags(payable.tags),
      installments: payable.installments.map(i => ({
        id: i.id,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate.split('T')[0],
        amount: i.amount,
        paidAmount: i.paidAmount,
        remaining: i.remaining ?? i.amount - i.paidAmount,
        status: i.status,
        notes: i.notes || null,
      })),
    };
  }
}
