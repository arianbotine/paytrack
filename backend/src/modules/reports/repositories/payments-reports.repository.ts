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
        DATE_TRUNC('month', p.payment_date) as period,
        COALESCE(SUM(pa.amount), 0)::DECIMAL as payables,
        0::DECIMAL as receivables,
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
      SELECT COUNT(DISTINCT c.id) as count
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
}
