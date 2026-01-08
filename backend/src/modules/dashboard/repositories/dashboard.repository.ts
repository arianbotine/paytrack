import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Repository: Dashboard
 * Responsabilidade: Isolar acesso aos dados do dashboard
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agrupa installments de payables por status no período especificado
   */
  async getPayableInstallmentsSummary(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    return this.prisma.payableInstallment.groupBy({
      by: ['status'],
      where: {
        organizationId,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });
  }

  /**
   * Agrupa installments de receivables por status no período especificado
   */
  async getReceivableInstallmentsSummary(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    return this.prisma.receivableInstallment.groupBy({
      by: ['status'],
      where: {
        organizationId,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true, receivedAmount: true },
      _count: true,
    });
  }

  /**
   * Busca payables vencidos (com installments em aberto e vencimento anterior à data de referência)
   */
  async getOverduePayableInstallments(
    organizationId: string,
    _startDate: Date,
    referenceDate: Date,
    limit = 10
  ) {
    const referenceDateStr = referenceDate.toISOString().split('T')[0];

    // Primeiro buscar os payables que têm installments vencidos (dueDate < hoje, date-only)
    const payableIds = await this.prisma.$queryRaw<
      Array<{ payableId: string }>
    >(
      Prisma.sql`
        SELECT DISTINCT payable_id as "payableId"
        FROM payable_installments
        WHERE organization_id = ${organizationId}
          AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          AND due_date::date < ${referenceDateStr}::date
        LIMIT ${limit}
      `
    );

    const payableIdsCompat = payableIds.map(row => ({
      payableId: row.payableId,
    }));
    if (payableIdsCompat.length === 0) {
      return [];
    }

    const ids = payableIdsCompat.map(p => p.payableId);

    // Buscar os payables com dados completos
    const payables = await this.prisma.payable.findMany({
      where: {
        id: { in: ids },
        organizationId,
      },
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    // Buscar próxima data não paga + valor do próximo vencimento para cada payable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{
              payable_id: string;
              next_due_date: Date;
              next_due_amount: unknown;
            }>
          >`
          SELECT DISTINCT ON (payable_id)
            payable_id,
            due_date::date as next_due_date,
            (amount - COALESCE(paid_amount, 0)) as next_due_amount
          FROM payable_installments
          WHERE payable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          ORDER BY payable_id, due_date ASC
        `
        : [];

    // Criar map de IDs para (data, valor)
    const dueInfoMap = new Map<string, { dueDate: string; amount: string }>();
    for (const row of nextDueDatesRaw) {
      dueInfoMap.set(row.payable_id, {
        dueDate: row.next_due_date.toISOString().split('T')[0],
        amount: String(row.next_due_amount),
      });
    }

    // Retornar payables com nextUnpaidDueDate
    const result = payables.map(payable => ({
      ...payable,
      nextUnpaidDueDate: dueInfoMap.get(payable.id)?.dueDate || null,
      nextUnpaidAmount: dueInfoMap.get(payable.id)?.amount || null,
    }));

    // Ordenar por nextUnpaidDueDate (mais próximo primeiro)
    return result.sort((a, b) => {
      if (!a.nextUnpaidDueDate && !b.nextUnpaidDueDate) return 0;
      if (!a.nextUnpaidDueDate) return 1;
      if (!b.nextUnpaidDueDate) return -1;
      return a.nextUnpaidDueDate.localeCompare(b.nextUnpaidDueDate);
    });
  }

  /**
   * Busca receivables vencidos (com installments em aberto e vencimento anterior à data de referência)
   */
  async getOverdueReceivableInstallments(
    organizationId: string,
    _startDate: Date,
    referenceDate: Date,
    limit = 10
  ) {
    const referenceDateStr = referenceDate.toISOString().split('T')[0];

    // Primeiro buscar os receivables que têm installments vencidos (dueDate < hoje, date-only)
    const receivableIds = await this.prisma.$queryRaw<
      Array<{ receivableId: string }>
    >(
      Prisma.sql`
        SELECT DISTINCT receivable_id as "receivableId"
        FROM receivable_installments
        WHERE organization_id = ${organizationId}
          AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          AND due_date::date < ${referenceDateStr}::date
        LIMIT ${limit}
      `
    );

    const receivableIdsCompat = receivableIds.map(row => ({
      receivableId: row.receivableId,
    }));
    if (receivableIdsCompat.length === 0) {
      return [];
    }

    const ids = receivableIdsCompat.map(r => r.receivableId);

    // Buscar os receivables com dados completos
    const receivables = await this.prisma.receivable.findMany({
      where: {
        id: { in: ids },
        organizationId,
      },
      select: {
        id: true,
        amount: true,
        receivedAmount: true,
        customer: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    // Buscar próxima data não paga + valor do próximo vencimento para cada receivable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{
              receivable_id: string;
              next_due_date: Date;
              next_due_amount: unknown;
            }>
          >`
          SELECT DISTINCT ON (receivable_id)
            receivable_id,
            due_date::date as next_due_date,
            (amount - COALESCE(received_amount, 0)) as next_due_amount
          FROM receivable_installments
          WHERE receivable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          ORDER BY receivable_id, due_date ASC
        `
        : [];

    // Criar map de IDs para (data, valor)
    const dueInfoMap = new Map<string, { dueDate: string; amount: string }>();
    for (const row of nextDueDatesRaw) {
      dueInfoMap.set(row.receivable_id, {
        dueDate: row.next_due_date.toISOString().split('T')[0],
        amount: String(row.next_due_amount),
      });
    }

    // Retornar receivables com nextUnpaidDueDate
    const result = receivables.map(receivable => ({
      ...receivable,
      nextUnpaidDueDate: dueInfoMap.get(receivable.id)?.dueDate || null,
      nextUnpaidAmount: dueInfoMap.get(receivable.id)?.amount || null,
    }));

    // Ordenar por nextUnpaidDueDate (mais próximo primeiro)
    return result.sort((a, b) => {
      if (!a.nextUnpaidDueDate && !b.nextUnpaidDueDate) return 0;
      if (!a.nextUnpaidDueDate) return 1;
      if (!b.nextUnpaidDueDate) return -1;
      return a.nextUnpaidDueDate.localeCompare(b.nextUnpaidDueDate);
    });
  }

  /**
   * Busca payables próximos (com installments pending/partial) no período
   */
  async getUpcomingPayableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    // Primeiro buscar os payables que têm installments próximos
    const payableIds = await this.prisma.payableInstallment.findMany({
      where: {
        organizationId,
        status: {
          in: [
            AccountStatus.PENDING,
            AccountStatus.PARTIAL,
            AccountStatus.OVERDUE,
          ],
        },
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { payableId: true },
      distinct: ['payableId'],
      take: limit,
    });

    if (payableIds.length === 0) {
      return [];
    }

    const ids = payableIds.map(p => p.payableId);

    // Buscar os payables com dados completos
    const payables = await this.prisma.payable.findMany({
      where: {
        id: { in: ids },
        organizationId,
      },
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    // Buscar próxima data não paga + valor do próximo vencimento para cada payable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{
              payable_id: string;
              next_due_date: Date;
              next_due_amount: unknown;
            }>
          >`
          SELECT DISTINCT ON (payable_id)
            payable_id,
            due_date::date as next_due_date,
            (amount - COALESCE(paid_amount, 0)) as next_due_amount
          FROM payable_installments
          WHERE payable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          ORDER BY payable_id, due_date ASC
        `
        : [];

    // Criar map de IDs para (data, valor)
    const dueInfoMap = new Map<string, { dueDate: string; amount: string }>();
    for (const row of nextDueDatesRaw) {
      dueInfoMap.set(row.payable_id, {
        dueDate: row.next_due_date.toISOString().split('T')[0],
        amount: String(row.next_due_amount),
      });
    }

    // Retornar payables com nextUnpaidDueDate
    const result = payables.map(payable => ({
      ...payable,
      nextUnpaidDueDate: dueInfoMap.get(payable.id)?.dueDate || null,
      nextUnpaidAmount: dueInfoMap.get(payable.id)?.amount || null,
    }));

    // Ordenar por nextUnpaidDueDate (mais próximo primeiro)
    return result.sort((a, b) => {
      if (!a.nextUnpaidDueDate && !b.nextUnpaidDueDate) return 0;
      if (!a.nextUnpaidDueDate) return 1;
      if (!b.nextUnpaidDueDate) return -1;
      return a.nextUnpaidDueDate.localeCompare(b.nextUnpaidDueDate);
    });
  }

  /**
   * Busca receivables próximos (com installments pending/partial) no período
   */
  async getUpcomingReceivableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    // Primeiro buscar os receivables que têm installments próximos
    const receivableIds = await this.prisma.receivableInstallment.findMany({
      where: {
        organizationId,
        status: {
          in: [
            AccountStatus.PENDING,
            AccountStatus.PARTIAL,
            AccountStatus.OVERDUE,
          ],
        },
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { receivableId: true },
      distinct: ['receivableId'],
      take: limit,
    });

    if (receivableIds.length === 0) {
      return [];
    }

    const ids = receivableIds.map(r => r.receivableId);

    // Buscar os receivables com dados completos
    const receivables = await this.prisma.receivable.findMany({
      where: {
        id: { in: ids },
        organizationId,
      },
      select: {
        id: true,
        amount: true,
        receivedAmount: true,
        customer: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    // Buscar próxima data não paga + valor do próximo vencimento para cada receivable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{
              receivable_id: string;
              next_due_date: Date;
              next_due_amount: unknown;
            }>
          >`
          SELECT DISTINCT ON (receivable_id)
            receivable_id,
            due_date::date as next_due_date,
            (amount - COALESCE(received_amount, 0)) as next_due_amount
          FROM receivable_installments
          WHERE receivable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          ORDER BY receivable_id, due_date ASC
        `
        : [];

    // Criar map de IDs para (data, valor)
    const dueInfoMap = new Map<string, { dueDate: string; amount: string }>();
    for (const row of nextDueDatesRaw) {
      dueInfoMap.set(row.receivable_id, {
        dueDate: row.next_due_date.toISOString().split('T')[0],
        amount: String(row.next_due_amount),
      });
    }

    // Retornar receivables com nextUnpaidDueDate
    const result = receivables.map(receivable => ({
      ...receivable,
      nextUnpaidDueDate: dueInfoMap.get(receivable.id)?.dueDate || null,
      nextUnpaidAmount: dueInfoMap.get(receivable.id)?.amount || null,
    }));

    // Ordenar por nextUnpaidDueDate (mais próximo primeiro)
    return result.sort((a, b) => {
      if (!a.nextUnpaidDueDate && !b.nextUnpaidDueDate) return 0;
      if (!a.nextUnpaidDueDate) return 1;
      if (!b.nextUnpaidDueDate) return -1;
      return a.nextUnpaidDueDate.localeCompare(b.nextUnpaidDueDate);
    });
  }
}
