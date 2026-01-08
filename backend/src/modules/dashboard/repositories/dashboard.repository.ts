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
   * Busca payables vencidos (com installments overdue) no período
   */
  async getOverduePayableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    // Primeiro buscar os payables que têm installments vencidos
    const payableIds = await this.prisma.payableInstallment.findMany({
      where: {
        organizationId,
        status: AccountStatus.OVERDUE,
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

    // Buscar próxima data não paga para cada payable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{ payable_id: string; next_due_date: Date }>
          >`
          SELECT payable_id, MIN(due_date)::date as next_due_date
          FROM payable_installments
          WHERE payable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          GROUP BY payable_id
        `
        : [];

    // Criar map de IDs para datas
    const dueDateMap = new Map<string, string>();
    for (const row of nextDueDatesRaw) {
      dueDateMap.set(
        row.payable_id,
        row.next_due_date.toISOString().split('T')[0]
      );
    }

    // Retornar payables com nextUnpaidDueDate
    const result = payables.map(payable => ({
      ...payable,
      nextUnpaidDueDate: dueDateMap.get(payable.id) || null,
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
   * Busca receivables vencidos (com installments overdue) no período
   */
  async getOverdueReceivableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    // Primeiro buscar os receivables que têm installments vencidos
    const receivableIds = await this.prisma.receivableInstallment.findMany({
      where: {
        organizationId,
        status: AccountStatus.OVERDUE,
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

    // Buscar próxima data não paga para cada receivable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{ receivable_id: string; next_due_date: Date }>
          >`
          SELECT receivable_id, MIN(due_date)::date as next_due_date
          FROM receivable_installments
          WHERE receivable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          GROUP BY receivable_id
        `
        : [];

    // Criar map de IDs para datas
    const dueDateMap = new Map<string, string>();
    for (const row of nextDueDatesRaw) {
      dueDateMap.set(
        row.receivable_id,
        row.next_due_date.toISOString().split('T')[0]
      );
    }

    // Retornar receivables com nextUnpaidDueDate
    const result = receivables.map(receivable => ({
      ...receivable,
      nextUnpaidDueDate: dueDateMap.get(receivable.id) || null,
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
        status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
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

    // Buscar próxima data não paga para cada payable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{ payable_id: string; next_due_date: Date }>
          >`
          SELECT payable_id, MIN(due_date)::date as next_due_date
          FROM payable_installments
          WHERE payable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          GROUP BY payable_id
        `
        : [];

    // Criar map de IDs para datas
    const dueDateMap = new Map<string, string>();
    for (const row of nextDueDatesRaw) {
      dueDateMap.set(
        row.payable_id,
        row.next_due_date.toISOString().split('T')[0]
      );
    }

    // Retornar payables com nextUnpaidDueDate
    const result = payables.map(payable => ({
      ...payable,
      nextUnpaidDueDate: dueDateMap.get(payable.id) || null,
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
        status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
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

    // Buscar próxima data não paga para cada receivable usando raw query otimizada
    const nextDueDatesRaw =
      ids.length > 0
        ? await this.prisma.$queryRaw<
            Array<{ receivable_id: string; next_due_date: Date }>
          >`
          SELECT receivable_id, MIN(due_date)::date as next_due_date
          FROM receivable_installments
          WHERE receivable_id IN (${Prisma.join(ids)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          GROUP BY receivable_id
        `
        : [];

    // Criar map de IDs para datas
    const dueDateMap = new Map<string, string>();
    for (const row of nextDueDatesRaw) {
      dueDateMap.set(
        row.receivable_id,
        row.next_due_date.toISOString().split('T')[0]
      );
    }

    // Retornar receivables com nextUnpaidDueDate
    const result = receivables.map(receivable => ({
      ...receivable,
      nextUnpaidDueDate: dueDateMap.get(receivable.id) || null,
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
