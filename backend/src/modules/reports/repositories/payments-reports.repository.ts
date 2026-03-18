import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { PaymentsReportFilterDto } from '../dto';

interface TimeSeriesData {
  period: Date;
  payables: number;
  receivables: number;
  count: number;
}

interface BreakdownData {
  id: string;
  name: string;
  amount: number;
  count: number;
}

interface TagJson {
  id: string;
  name: string;
  color: string | null;
}

interface PaymentDetailData {
  id: string;
  payment_date: Date;
  amount: number;
  payment_method: string;
  payable_amount: number;
  receivable_amount: number;
  vendor_name: string | null;
  customer_name: string | null;
  category_name: string | null;
  reference: string | null;
  notes: string | null;
  tags_json: TagJson[] | null;
  total_count: bigint;
}

@Injectable()
export class PaymentsReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca dados de série temporal de pagamentos agregados por período
   * Índice utilizado: @@index([organizationId, paymentDate]) - Existente em Payment model
   */
  async getPaymentsTimeSeries(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    groupBy: string,
    filters?: PaymentsReportFilterDto
  ): Promise<TimeSeriesData[]> {
    // Validar e normalizar groupBy
    const validGroupBy = ['day', 'week', 'month'].includes(groupBy)
      ? groupBy
      : 'month';

    // Build dynamic WHERE conditions using Prisma.sql
    const categoryFilter =
      filters?.categoryIds && filters.categoryIds.length > 0
        ? Prisma.sql`AND (
            pay.category_id IN (${Prisma.join(filters.categoryIds)})
            OR rec.category_id IN (${Prisma.join(filters.categoryIds)})
          )`
        : Prisma.empty;

    const vendorFilter =
      filters?.vendorIds && filters.vendorIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            JOIN payable_installments pi ON pa_inner.payable_installment_id = pi.id
            JOIN payables pay_inner ON pi.payable_id = pay_inner.id
            WHERE pa_inner.payment_id = p.id
            AND pay_inner.vendor_id IN (${Prisma.join(filters.vendorIds)})
          )`
        : Prisma.empty;

    const customerFilter =
      filters?.customerIds && filters.customerIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            JOIN receivable_installments ri ON pa_inner.receivable_installment_id = ri.id
            JOIN receivables rec_inner ON ri.receivable_id = rec_inner.id
            WHERE pa_inner.payment_id = p.id
            AND rec_inner.customer_id IN (${Prisma.join(filters.customerIds)})
          )`
        : Prisma.empty;

    const tagFilter =
      filters?.tagIds && filters.tagIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            LEFT JOIN payable_installments pi ON pa_inner.payable_installment_id = pi.id
            LEFT JOIN payables pay_inner ON pi.payable_id = pay_inner.id
            LEFT JOIN receivable_installments ri ON pa_inner.receivable_installment_id = ri.id
            LEFT JOIN receivables rec_inner ON ri.receivable_id = rec_inner.id
            WHERE pa_inner.payment_id = p.id
            AND (
              EXISTS (
                SELECT 1 FROM payable_tags pt
                WHERE pt.payable_id = pay_inner.id
                AND pt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
              OR EXISTS (
                SELECT 1 FROM receivable_tags rt
                WHERE rt.receivable_id = rec_inner.id
                AND rt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
            )
          )`
        : Prisma.empty;

    const result = await this.prisma.$queryRaw<TimeSeriesData[]>`
      SELECT
        DATE_TRUNC(${validGroupBy}::text, p.payment_date) as period,
        COALESCE(SUM(CASE WHEN pa.payable_installment_id IS NOT NULL THEN pa.amount ELSE 0 END), 0)::DECIMAL as payables,
        COALESCE(SUM(CASE WHEN pa.receivable_installment_id IS NOT NULL THEN pa.amount ELSE 0 END), 0)::DECIMAL as receivables,
        COUNT(DISTINCT p.id) as count
      FROM payments p
      JOIN payment_allocations pa ON p.id = pa.payment_id
      LEFT JOIN payable_installments pi ON pa.payable_installment_id = pi.id
      LEFT JOIN payables pay ON pi.payable_id = pay.id
      LEFT JOIN receivable_installments ri ON pa.receivable_installment_id = ri.id
      LEFT JOIN receivables rec ON ri.receivable_id = rec.id
      WHERE p.organization_id = ${organizationId}
        AND p.payment_date >= ${startDate}
        AND p.payment_date <= ${endDate}
        ${categoryFilter}
        ${vendorFilter}
        ${customerFilter}
        ${tagFilter}
      GROUP BY period
      ORDER BY period ASC
    `;

    return result;
  }

  /**
   * Busca breakdown de pagamentos por categoria
   */
  async getBreakdownByCategory(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    skip: number,
    take: number,
    filters?: PaymentsReportFilterDto
  ): Promise<{ data: BreakdownData[]; total: number }> {
    // Build dynamic WHERE conditions (same as getPaymentsTimeSeries)
    const categoryFilter =
      filters?.categoryIds && filters.categoryIds.length > 0
        ? Prisma.sql`AND c.id IN (${Prisma.join(filters.categoryIds)})`
        : Prisma.empty;

    const vendorFilter =
      filters?.vendorIds && filters.vendorIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            JOIN payable_installments pi ON pa_inner.payable_installment_id = pi.id
            JOIN payables pay_inner ON pi.payable_id = pay_inner.id
            WHERE pa_inner.payment_id = p.id
            AND pay_inner.vendor_id IN (${Prisma.join(filters.vendorIds)})
          )`
        : Prisma.empty;

    const customerFilter =
      filters?.customerIds && filters.customerIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            JOIN receivable_installments ri ON pa_inner.receivable_installment_id = ri.id
            JOIN receivables rec_inner ON ri.receivable_id = rec_inner.id
            WHERE pa_inner.payment_id = p.id
            AND rec_inner.customer_id IN (${Prisma.join(filters.customerIds)})
          )`
        : Prisma.empty;

    const tagFilter =
      filters?.tagIds && filters.tagIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            LEFT JOIN payable_installments pi ON pa_inner.payable_installment_id = pi.id
            LEFT JOIN payables pay_inner ON pi.payable_id = pay_inner.id
            LEFT JOIN receivable_installments ri ON pa_inner.receivable_installment_id = ri.id
            LEFT JOIN receivables rec_inner ON ri.receivable_id = rec_inner.id
            WHERE pa_inner.payment_id = p.id
            AND (
              EXISTS (
                SELECT 1 FROM payable_tags pt
                WHERE pt.payable_id = pay_inner.id
                AND pt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
              OR EXISTS (
                SELECT 1 FROM receivable_tags rt
                WHERE rt.receivable_id = rec_inner.id
                AND rt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
            )
          )`
        : Prisma.empty;

    const data = await this.prisma.$queryRaw<BreakdownData[]>`
      WITH category_data AS (
        SELECT
          c.id,
          c.name,
          SUM(pa.amount)::DECIMAL as amount,
          COUNT(DISTINCT p.id) as count
        FROM payments p
        JOIN payment_allocations pa ON p.id = pa.payment_id
        LEFT JOIN payable_installments pi ON pa.payable_installment_id = pi.id
        LEFT JOIN payables pay ON pi.payable_id = pay.id
        LEFT JOIN receivable_installments ri ON pa.receivable_installment_id = ri.id
        LEFT JOIN receivables rec ON ri.receivable_id = rec.id
        LEFT JOIN categories c ON (c.id = pay.category_id OR c.id = rec.category_id)
        WHERE p.organization_id = ${organizationId}
          AND p.payment_date >= ${startDate}
          AND p.payment_date <= ${endDate}
          AND c.id IS NOT NULL
          ${categoryFilter}
          ${vendorFilter}
          ${customerFilter}
          ${tagFilter}
        GROUP BY c.id, c.name
      )
      SELECT id, name, amount, count
      FROM category_data
      ORDER BY amount DESC
      LIMIT ${take}
      OFFSET ${skip}
    `;

    const totalResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      WITH category_data AS (
        SELECT
          c.id
        FROM payments p
        JOIN payment_allocations pa ON p.id = pa.payment_id
        LEFT JOIN payable_installments pi ON pa.payable_installment_id = pi.id
        LEFT JOIN payables pay ON pi.payable_id = pay.id
        LEFT JOIN receivable_installments ri ON pa.receivable_installment_id = ri.id
        LEFT JOIN receivables rec ON ri.receivable_id = rec.id
        LEFT JOIN categories c ON (c.id = pay.category_id OR c.id = rec.category_id)
        WHERE p.organization_id = ${organizationId}
          AND p.payment_date >= ${startDate}
          AND p.payment_date <= ${endDate}
          AND c.id IS NOT NULL
          ${categoryFilter}
          ${vendorFilter}
          ${customerFilter}
          ${tagFilter}
        GROUP BY c.id
      )
      SELECT COUNT(*)::bigint as count
      FROM category_data
    `;

    return {
      data,
      total: Number(totalResult[0]?.count || 0),
    };
  }

  /**
   * Busca breakdown de pagamentos por método de pagamento
   */
  async getBreakdownByPaymentMethod(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    skip: number,
    take: number,
    filters?: PaymentsReportFilterDto
  ): Promise<{ data: BreakdownData[]; total: number }> {
    // Build dynamic WHERE conditions (same as getPaymentsTimeSeries but applied to payments table)
    const vendorFilter =
      filters?.vendorIds && filters.vendorIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa
            JOIN payable_installments pi ON pa.payable_installment_id = pi.id
            JOIN payables pay ON pi.payable_id = pay.id
            WHERE pa.payment_id = p.id
            AND pay.vendor_id IN (${Prisma.join(filters.vendorIds)})
          )`
        : Prisma.empty;

    const customerFilter =
      filters?.customerIds && filters.customerIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa
            JOIN receivable_installments ri ON pa.receivable_installment_id = ri.id
            JOIN receivables rec ON ri.receivable_id = rec.id
            WHERE pa.payment_id = p.id
            AND rec.customer_id IN (${Prisma.join(filters.customerIds)})
          )`
        : Prisma.empty;

    const categoryFilter =
      filters?.categoryIds && filters.categoryIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa
            LEFT JOIN payable_installments pi ON pa.payable_installment_id = pi.id
            LEFT JOIN payables pay ON pi.payable_id = pay.id
            LEFT JOIN receivable_installments ri ON pa.receivable_installment_id = ri.id
            LEFT JOIN receivables rec ON ri.receivable_id = rec.id
            WHERE pa.payment_id = p.id
            AND (pay.category_id IN (${Prisma.join(filters.categoryIds)}) OR rec.category_id IN (${Prisma.join(filters.categoryIds)}))
          )`
        : Prisma.empty;

    const tagFilter =
      filters?.tagIds && filters.tagIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa
            LEFT JOIN payable_installments pi ON pa.payable_installment_id = pi.id
            LEFT JOIN payables pay ON pi.payable_id = pay.id
            LEFT JOIN receivable_installments ri ON pa.receivable_installment_id = ri.id
            LEFT JOIN receivables rec ON ri.receivable_id = rec.id
            WHERE pa.payment_id = p.id
            AND (
              EXISTS (
                SELECT 1 FROM payable_tags pt
                WHERE pt.payable_id = pay.id
                AND pt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
              OR EXISTS (
                SELECT 1 FROM receivable_tags rt
                WHERE rt.receivable_id = rec.id
                AND rt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
            )
          )`
        : Prisma.empty;

    const data = await this.prisma.$queryRaw<BreakdownData[]>`
      WITH method_data AS (
        SELECT
          p.payment_method::text as id,
          p.payment_method::text as name,
          SUM(p.amount)::DECIMAL as amount,
          COUNT(p.id) as count
        FROM payments p
        WHERE p.organization_id = ${organizationId}
          AND p.payment_date >= ${startDate}
          AND p.payment_date <= ${endDate}
          ${vendorFilter}
          ${customerFilter}
          ${categoryFilter}
          ${tagFilter}
        GROUP BY p.payment_method
      )
      SELECT id, name, amount, count
      FROM method_data
      ORDER BY amount DESC
      LIMIT ${take}
      OFFSET ${skip}
    `;

    const totalResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT p.payment_method) as count
      FROM payments p
      WHERE p.organization_id = ${organizationId}
        AND p.payment_date >= ${startDate}
        AND p.payment_date <= ${endDate}
        ${vendorFilter}
        ${customerFilter}
        ${categoryFilter}
        ${tagFilter}
    `;

    return {
      data,
      total: Number(totalResult[0]?.count || 0),
    };
  }

  /**
   * Busca lista detalhada de pagamentos individuais para exibição em tabela
   * Um registro por pagamento, com fornecedor/cliente/categoria agregados via STRING_AGG
   */
  async getPaymentsDetails(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    skip: number,
    take: number,
    filters?: PaymentsReportFilterDto
  ): Promise<{ data: PaymentDetailData[]; total: number }> {
    const categoryFilter =
      filters?.categoryIds && filters.categoryIds.length > 0
        ? Prisma.sql`AND (
            pay.category_id IN (${Prisma.join(filters.categoryIds)})
            OR rec.category_id IN (${Prisma.join(filters.categoryIds)})
          )`
        : Prisma.empty;

    const vendorFilter =
      filters?.vendorIds && filters.vendorIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            JOIN payable_installments pi ON pa_inner.payable_installment_id = pi.id
            JOIN payables pay_inner ON pi.payable_id = pay_inner.id
            WHERE pa_inner.payment_id = p.id
            AND pay_inner.vendor_id IN (${Prisma.join(filters.vendorIds)})
          )`
        : Prisma.empty;

    const customerFilter =
      filters?.customerIds && filters.customerIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            JOIN receivable_installments ri ON pa_inner.receivable_installment_id = ri.id
            JOIN receivables rec_inner ON ri.receivable_id = rec_inner.id
            WHERE pa_inner.payment_id = p.id
            AND rec_inner.customer_id IN (${Prisma.join(filters.customerIds)})
          )`
        : Prisma.empty;

    const tagFilter =
      filters?.tagIds && filters.tagIds.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM payment_allocations pa_inner
            LEFT JOIN payable_installments pi ON pa_inner.payable_installment_id = pi.id
            LEFT JOIN payables pay_inner ON pi.payable_id = pay_inner.id
            LEFT JOIN receivable_installments ri ON pa_inner.receivable_installment_id = ri.id
            LEFT JOIN receivables rec_inner ON ri.receivable_id = rec_inner.id
            WHERE pa_inner.payment_id = p.id
            AND (
              EXISTS (
                SELECT 1 FROM payable_tags pt
                WHERE pt.payable_id = pay_inner.id
                AND pt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
              OR EXISTS (
                SELECT 1 FROM receivable_tags rt
                WHERE rt.receivable_id = rec_inner.id
                AND rt.tag_id IN (${Prisma.join(filters.tagIds)})
              )
            )
          )`
        : Prisma.empty;

    const data = await this.prisma.$queryRaw<PaymentDetailData[]>`
      SELECT
        p.id,
        p.payment_date,
        p.amount::DECIMAL as amount,
        p.payment_method,
        p.reference,
        p.notes,
        COALESCE(SUM(CASE WHEN pa.payable_installment_id IS NOT NULL THEN pa.amount ELSE 0 END), 0)::DECIMAL as payable_amount,
        COALESCE(SUM(CASE WHEN pa.receivable_installment_id IS NOT NULL THEN pa.amount ELSE 0 END), 0)::DECIMAL as receivable_amount,
        STRING_AGG(DISTINCT v.name, ', ') as vendor_name,
        STRING_AGG(DISTINCT cust.name, ', ') as customer_name,
        STRING_AGG(DISTINCT c.name, ', ') as category_name,
        (
          SELECT JSON_AGG(tags_sub)
          FROM (
            SELECT DISTINCT jsonb_build_object('id', t2.id, 'name', t2.name, 'color', t2.color) as tags_sub
            FROM payment_allocations pa2
            LEFT JOIN payable_installments pi2 ON pa2.payable_installment_id = pi2.id
            LEFT JOIN payables pay2 ON pi2.payable_id = pay2.id
            LEFT JOIN receivable_installments ri2 ON pa2.receivable_installment_id = ri2.id
            LEFT JOIN receivables rec2 ON ri2.receivable_id = rec2.id
            LEFT JOIN payable_tags pt2 ON pay2.id = pt2.payable_id
            LEFT JOIN receivable_tags rt2 ON rec2.id = rt2.receivable_id
            LEFT JOIN tags t2 ON (t2.id = pt2.tag_id OR t2.id = rt2.tag_id)
            WHERE pa2.payment_id = p.id
              AND t2.id IS NOT NULL
          ) tags_agg
        ) as tags_json,
        COUNT(*) OVER() as total_count
      FROM payments p
      JOIN payment_allocations pa ON p.id = pa.payment_id
      LEFT JOIN payable_installments pi ON pa.payable_installment_id = pi.id
      LEFT JOIN payables pay ON pi.payable_id = pay.id
      LEFT JOIN receivable_installments ri ON pa.receivable_installment_id = ri.id
      LEFT JOIN receivables rec ON ri.receivable_id = rec.id
      LEFT JOIN vendors v ON pay.vendor_id = v.id
      LEFT JOIN customers cust ON rec.customer_id = cust.id
      LEFT JOIN categories c ON (c.id = pay.category_id OR c.id = rec.category_id)
      WHERE p.organization_id = ${organizationId}
        AND p.payment_date >= ${startDate}
        AND p.payment_date <= ${endDate}
        ${categoryFilter}
        ${vendorFilter}
        ${customerFilter}
        ${tagFilter}
      GROUP BY p.id, p.payment_date, p.amount, p.payment_method, p.reference, p.notes
      ORDER BY p.payment_date DESC
      LIMIT ${take}
      OFFSET ${skip}
    `;

    const total = data.length > 0 ? Number(data[0].total_count) : 0;

    return { data, total };
  }
}
