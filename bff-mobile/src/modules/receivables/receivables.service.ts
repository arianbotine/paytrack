import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HttpClientService } from '../../infrastructure/http-client.service';
import {
  ReceivableFilterDto,
  QuickReceiveDto,
  CreateReceivableBffDto,
} from './receivables.dto';

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

interface BackendReceivable {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string };
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
    /** Available in payable installments; not in receivable installments. */
    paidAmount?: number;
    /** Backend-computed remaining (null when PAID). Present in receivable installments. */
    remaining?: number | null;
    status: string;
    notes?: string;
  }>;
}

export interface MobileReceivableListItem {
  id: string;
  amount: number;
  status: string;
  customerName: string | null;
  categoryName: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  nextInstallmentId: string | null;
  installmentsCount: number;
  receivedInstallments: number;
}

export interface MobileReceivableDetail {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  customer: { id: string; name: string } | null;
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
export class ReceivablesService {
  constructor(private readonly httpClient: HttpClientService) {}

  /**
   * List receivables with mobile-optimized response.
   */
  async findAll(
    accessToken: string,
    filters: ReceivableFilterDto
  ): Promise<{ items: MobileReceivableListItem[]; total: number }> {
    // Build query string
    const params = new URLSearchParams();
    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      statuses.forEach(s => params.append('status', s));
    }
    if (filters.customerId) params.set('customerId', filters.customerId);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.dueDateFrom)
      params.set('installmentDueDateFrom', filters.dueDateFrom);
    if (filters.dueDateTo)
      params.set('installmentDueDateTo', filters.dueDateTo);

    // Mobile defaults: smaller page size
    params.set('take', String(filters.take || 15));
    params.set('skip', String(filters.skip || 0));

    const url = `/receivables?${params.toString()}`;
    const response = await this.httpClient.get<
      { data: BackendReceivable[]; total: number } | BackendReceivable[]
    >(url, accessToken);

    // Backend returns { data, total } from paginated endpoint
    const list = Array.isArray(response) ? response : response.data;
    const total = Array.isArray(response) ? response.length : response.total;

    // Transform for mobile
    const items = list.map(receivable => this.transformToListItem(receivable));

    return { items, total };
  }

  /**
   * Get single receivable detail.
   */
  async findOne(
    accessToken: string,
    id: string
  ): Promise<MobileReceivableDetail> {
    const data = await this.httpClient.get<BackendReceivable>(
      `/receivables/${id}`,
      accessToken
    );
    return this.transformToDetail(data);
  }

  /**
   * Quick receive - register payment for a receivable installment.
   */
  async quickReceive(
    accessToken: string,
    _receivableId: string,
    installmentId: string,
    dto: QuickReceiveDto
  ) {
    const payload = {
      type: 'receivable',
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
   * Create a new receivable.
   */
  async create(
    accessToken: string,
    dto: CreateReceivableBffDto
  ): Promise<{ id: string }> {
    const count = dto.installmentCount ?? 1;
    const dueDates = buildMonthlyDueDates(dto.firstDueDate, count);

    const payload: Record<string, unknown> = {
      customerId: dto.customerId,
      amount: dto.amount,
      installmentCount: count,
      dueDates,
    };
    if (dto.categoryId) payload.categoryId = dto.categoryId;
    if (dto.notes) payload.notes = dto.notes;
    if (dto.tagIds && dto.tagIds.length > 0) payload.tagIds = dto.tagIds;

    return this.httpClient.post<{ id: string }>(
      '/receivables',
      payload,
      accessToken,
      { headers: { 'idempotency-key': randomUUID() } }
    );
  }

  /**
   * Get payment history for a receivable.
   */
  async getPayments(accessToken: string, id: string) {
    return this.httpClient.get(`/receivables/${id}/payments`, accessToken);
  }

  private transformToListItem(
    receivable: BackendReceivable
  ): MobileReceivableListItem {
    // Find the next pending/partial installment
    const pendingInstallments = receivable.installments
      .filter(i => i.status !== 'PAID')
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    const nextInstallment = pendingInstallments[0];
    const receivedCount = receivable.installments.filter(
      i => i.status === 'PAID'
    ).length;

    // Compute remaining amount: use backend's field if present, else calculate
    const nextDueAmount = nextInstallment
      ? (nextInstallment.remaining ??
        nextInstallment.amount - (nextInstallment.paidAmount ?? 0))
      : null;

    return {
      id: receivable.id,
      amount: receivable.amount,
      status: receivable.status,
      customerName: receivable.customer?.name || null,
      categoryName: receivable.category?.name || null,
      tags: flattenTags(receivable.tags),
      nextDueDate: nextInstallment?.dueDate
        ? nextInstallment.dueDate.split('T')[0]
        : null,
      nextDueAmount,
      nextInstallmentId: nextInstallment?.id ?? null,
      installmentsCount: receivable.installments.length,
      receivedInstallments: receivedCount,
    };
  }

  private transformToDetail(
    receivable: BackendReceivable
  ): MobileReceivableDetail {
    return {
      id: receivable.id,
      amount: receivable.amount,
      status: receivable.status,
      createdAt: receivable.createdAt,
      customer: receivable.customer || null,
      category: receivable.category || null,
      tags: flattenTags(receivable.tags),
      installments: receivable.installments.map(i => {
        // Backend may return 'remaining' directly (null when PAID = 0 remaining)
        const remaining = i.remaining ?? 0;
        const paidAmount = i.paidAmount ?? i.amount - remaining;
        return {
          id: i.id,
          installmentNumber: i.installmentNumber,
          dueDate: i.dueDate.split('T')[0],
          amount: i.amount,
          paidAmount,
          remaining,
          status: i.status,
          notes: i.notes || null,
        };
      }),
    };
  }
}
