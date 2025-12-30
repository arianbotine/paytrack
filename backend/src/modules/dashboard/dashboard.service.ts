import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PayablesService } from '../payables/payables.service';
import { ReceivablesService } from '../receivables/receivables.service';
import { CacheService } from '../../shared/services/cache.service';

type GroupedInstallment = {
  _sum: {
    amount: Decimal | null;
    paidAmount?: Decimal | null;
    receivedAmount?: Decimal | null;
  };
  _count: number;
  status: AccountStatus;
};

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payablesService: PayablesService,
    private readonly receivablesService: ReceivablesService,
    private readonly cacheService: CacheService
  ) {}

  async getSummary(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    const cacheTTL = Number.parseInt(
      process.env.CACHE_TTL_DASHBOARD || '300',
      10
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(
          `Gerando dashboard para organizationId: ${organizationId}`
        );
        return this.generateSummary(organizationId);
      },
      cacheTTL
    );
  }

  invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    this.cacheService.del(cacheKey);
    this.logger.debug(`Cache invalidado: ${cacheKey}`);
  }

  private async generateSummary(organizationId: string) {
    // Usar datas em UTC para evitar problemas de timezone
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

    const in7Days = new Date(todayUTC);
    in7Days.setDate(in7Days.getDate() + 7);

    // Queries usando as tabelas de installments separadas
    const [
      payableInstallments,
      receivableInstallments,
      overduePayableInstallments,
      overdueReceivableInstallments,
      upcomingPayableInstallments,
      upcomingReceivableInstallments,
    ] = await Promise.all([
      // PayableInstallment summary
      this.prisma.payableInstallment.groupBy({
        by: ['status'],
        where: { organizationId },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),

      // ReceivableInstallment summary
      this.prisma.receivableInstallment.groupBy({
        by: ['status'],
        where: { organizationId },
        _sum: { amount: true, receivedAmount: true },
        _count: true,
      }),

      // Overdue payable installments
      this.prisma.payableInstallment.findMany({
        where: {
          organizationId,
          status: AccountStatus.OVERDUE,
        },
        include: {
          payable: {
            select: {
              id: true,
              description: true,
              vendor: { select: { id: true, name: true } },
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        take: 10,
      }),

      // Overdue receivable installments
      this.prisma.receivableInstallment.findMany({
        where: {
          organizationId,
          status: AccountStatus.OVERDUE,
        },
        include: {
          receivable: {
            select: {
              id: true,
              description: true,
              customer: { select: { id: true, name: true } },
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        take: 10,
      }),

      // Upcoming payable installments (next 7 days)
      this.prisma.payableInstallment.findMany({
        where: {
          organizationId,
          status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
          dueDate: { gte: todayUTC, lte: in7Days },
        },
        include: {
          payable: {
            select: {
              id: true,
              description: true,
              vendor: { select: { id: true, name: true } },
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        take: 10,
      }),

      // Upcoming receivable installments (next 7 days)
      this.prisma.receivableInstallment.findMany({
        where: {
          organizationId,
          status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
          dueDate: { gte: todayUTC, lte: in7Days },
        },
        include: {
          receivable: {
            select: {
              id: true,
              description: true,
              customer: { select: { id: true, name: true } },
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        take: 10,
      }),
    ]);

    const payableTotals = this.calculateTotals(payableInstallments);
    const receivableTotals = this.calculateTotals(receivableInstallments);

    return {
      payableInstallments: {
        totals: payableTotals,
        overdue: overduePayableInstallments,
        upcoming: upcomingPayableInstallments,
      },
      receivableInstallments: {
        totals: receivableTotals,
        overdue: overdueReceivableInstallments,
        upcoming: upcomingReceivableInstallments,
      },
      balance: {
        toReceive:
          receivableTotals.pending +
          receivableTotals.partial +
          receivableTotals.overdue,
        toPay:
          payableTotals.pending + payableTotals.partial + payableTotals.overdue,
        net:
          receivableTotals.pending +
          receivableTotals.partial +
          receivableTotals.overdue -
          (payableTotals.pending +
            payableTotals.partial +
            payableTotals.overdue),
      },
    };
  }

  private calculateTotals(grouped: GroupedInstallment[]) {
    const totals = {
      total: 0,
      paid: 0,
      pending: 0,
      partial: 0,
      overdue: 0,
      cancelled: 0,
      count: 0,
    };

    for (const group of grouped) {
      const amount = Number(group._sum.amount || 0);
      const paidAmount = Number(
        group._sum.paidAmount || group._sum.receivedAmount || 0
      );
      const remaining = amount - paidAmount;

      totals.count += group._count;
      totals.total += amount;

      switch (group.status) {
        case AccountStatus.PAID:
          totals.paid += amount;
          break;
        case AccountStatus.PENDING:
          totals.pending += remaining;
          break;
        case AccountStatus.PARTIAL:
          totals.partial += remaining;
          break;
        case AccountStatus.OVERDUE:
          totals.overdue += remaining;
          break;
        case AccountStatus.CANCELLED:
          totals.cancelled += amount;
          break;
      }
    }

    return totals;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateOverdueStatus() {
    this.logger.log('Iniciando atualização de status de contas vencidas');

    try {
      const [payableResult, receivableResult] = await Promise.all([
        this.payablesService.updateOverdueStatus(),
        this.receivablesService.updateOverdueStatus(),
      ]);

      this.logger.log(
        `Atualização concluída: ${payableResult.count} payable installments e ${receivableResult.count} receivable installments atualizadas`
      );
    } catch (error) {
      this.logger.error('Erro ao atualizar status de contas vencidas', error);
    }
  }
}
