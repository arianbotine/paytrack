import { Injectable } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
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
   * Busca installments de payables vencidos no período
   */
  async getOverduePayableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    return this.prisma.payableInstallment.findMany({
      where: {
        organizationId,
        status: AccountStatus.OVERDUE,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payable: {
          select: {
            id: true,
            vendor: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
            tags: {
              select: {
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      take: limit,
    });
  }

  /**
   * Busca installments de receivables vencidos no período
   */
  async getOverdueReceivableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    return this.prisma.receivableInstallment.findMany({
      where: {
        organizationId,
        status: AccountStatus.OVERDUE,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        receivable: {
          select: {
            id: true,
            customer: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
            tags: {
              select: {
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      take: limit,
    });
  }

  /**
   * Busca installments de payables próximos (pending/partial) no período
   */
  async getUpcomingPayableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    return this.prisma.payableInstallment.findMany({
      where: {
        organizationId,
        status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payable: {
          select: {
            id: true,
            vendor: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
            tags: {
              select: {
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      take: limit,
    });
  }

  /**
   * Busca installments de receivables próximos (pending/partial) no período
   */
  async getUpcomingReceivableInstallments(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    return this.prisma.receivableInstallment.findMany({
      where: {
        organizationId,
        status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        receivable: {
          select: {
            id: true,
            customer: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
            tags: {
              select: {
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      take: limit,
    });
  }
}
