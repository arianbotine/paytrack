import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  PendingAccountType,
  PendingAccountsDueStatus,
  PendingAccountsReportFilterDto,
} from '../dto';

interface PendingAccountRawRow {
  type: PendingAccountType.PAYABLE | PendingAccountType.RECEIVABLE;
  account_id: string;
  installment_id: string;
  counterparty_name: string;
  category_name: string | null;
  installment_number: number;
  total_installments: number;
  due_date: Date;
  amount: unknown;
  settled_amount: unknown;
  outstanding_amount: unknown;
  status: 'PENDING' | 'PARTIAL';
  account_notes: string | null;
  installment_notes: string | null;
}

interface PendingAccountsSummaryRaw {
  total: bigint;
  payable_count: bigint;
  receivable_count: bigint;
  payable_outstanding_amount: unknown;
  receivable_outstanding_amount: unknown;
}

@Injectable()
export class PendingAccountsReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByFilters(
    organizationId: string,
    filters: PendingAccountsReportFilterDto
  ): Promise<{
    data: PendingAccountRawRow[];
    summary: PendingAccountsSummaryRaw;
  }> {
    const baseQuery = this.buildBaseQuery(organizationId, filters);
    const [data, summaryRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<PendingAccountRawRow[]>`${baseQuery}
        SELECT * FROM pending_accounts
        ORDER BY due_date ASC, type ASC, installment_number ASC, account_id ASC
        LIMIT ${filters.take} OFFSET ${filters.skip}`,
      this.prisma.$queryRaw<PendingAccountsSummaryRaw[]>`${baseQuery}
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE type = 'PAYABLE')::bigint AS payable_count,
          COUNT(*) FILTER (WHERE type = 'RECEIVABLE')::bigint AS receivable_count,
          COALESCE(SUM(outstanding_amount) FILTER (WHERE type = 'PAYABLE'), 0)::numeric AS payable_outstanding_amount,
          COALESCE(SUM(outstanding_amount) FILTER (WHERE type = 'RECEIVABLE'), 0)::numeric AS receivable_outstanding_amount
        FROM pending_accounts`,
    ]);

    return { data, summary: summaryRows[0] };
  }

  private buildBaseQuery(
    organizationId: string,
    filters: PendingAccountsReportFilterDto
  ): Prisma.Sql {
    const dueStatusFilter = (alias: 'pi' | 'ri') =>
      filters.dueStatus === PendingAccountsDueStatus.OVERDUE
        ? Prisma.sql`AND ${Prisma.raw(alias)}.due_date < CURRENT_DATE`
        : Prisma.sql`AND ${Prisma.raw(alias)}.due_date >= CURRENT_DATE`;

    const dateFilters = (alias: 'pi' | 'ri') => Prisma.sql`
      ${
        filters.startDate
          ? Prisma.sql`AND ${Prisma.raw(alias)}.due_date >= ${new Date(`${filters.startDate}T00:00:00.000Z`)}::date`
          : Prisma.empty
      }
      ${
        filters.endDate
          ? Prisma.sql`AND ${Prisma.raw(alias)}.due_date <= ${new Date(`${filters.endDate}T00:00:00.000Z`)}::date`
          : Prisma.empty
      }
    `;

    const queries: Prisma.Sql[] = [];

    if (filters.type !== PendingAccountType.RECEIVABLE) {
      queries.push(Prisma.sql`
        SELECT
          'PAYABLE'::text AS type,
          p.id AS account_id,
          pi.id AS installment_id,
          v.name AS counterparty_name,
          c.name AS category_name,
          pi.installment_number,
          pi.total_installments,
          pi.due_date,
          pi.amount,
          pi.paid_amount AS settled_amount,
          pi.amount - pi.paid_amount AS outstanding_amount,
          pi.status::text AS status,
          p.notes AS account_notes,
          pi.notes AS installment_notes
        FROM payable_installments pi
        JOIN payables p ON p.id = pi.payable_id
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE pi.organization_id = ${organizationId}
          AND p.organization_id = ${organizationId}
          AND pi.status::text IN ('PENDING', 'PARTIAL')
          AND pi.amount > pi.paid_amount
          ${dueStatusFilter('pi')}
          ${dateFilters('pi')}
      `);
    }

    if (filters.type !== PendingAccountType.PAYABLE) {
      queries.push(Prisma.sql`
        SELECT
          'RECEIVABLE'::text AS type,
          r.id AS account_id,
          ri.id AS installment_id,
          cu.name AS counterparty_name,
          c.name AS category_name,
          ri.installment_number,
          ri.total_installments,
          ri.due_date,
          ri.amount,
          ri.received_amount AS settled_amount,
          ri.amount - ri.received_amount AS outstanding_amount,
          ri.status::text AS status,
          r.notes AS account_notes,
          ri.notes AS installment_notes
        FROM receivable_installments ri
        JOIN receivables r ON r.id = ri.receivable_id
        JOIN customers cu ON cu.id = r.customer_id
        LEFT JOIN categories c ON c.id = r.category_id
        WHERE ri.organization_id = ${organizationId}
          AND r.organization_id = ${organizationId}
          AND ri.status::text IN ('PENDING', 'PARTIAL')
          AND ri.amount > ri.received_amount
          ${dueStatusFilter('ri')}
          ${dateFilters('ri')}
      `);
    }

    return Prisma.sql`WITH pending_accounts AS (${Prisma.join(queries, ' UNION ALL ')})`;
  }
}
