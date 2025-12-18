import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PayablesService } from '../payables/payables.service';
import { ReceivablesService } from '../receivables/receivables.service';
import { CacheService } from '../../shared/services/cache.service';

type GroupedItem = {
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
    ); // 5 minutos padrão

    // Tenta buscar do cache primeiro
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

  /**
   * Invalida o cache do dashboard para uma organização
   */
  invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    this.cacheService.del(cacheKey);
    this.logger.debug(`Cache invalidado: ${cacheKey}`);
  }

  private async generateSummary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    // Paralelizar todas as queries para melhor performance
    const [
      payables,
      receivables,
      overduePayables,
      overdueReceivables,
      upcomingPayables,
      upcomingReceivables,
    ] = await Promise.all([
      // Payables summary
      this.prisma.payable.groupBy({
        by: ['status'],
        where: { organizationId },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),

      // Receivables summary
      this.prisma.receivable.groupBy({
        by: ['status'],
        where: { organizationId },
        _sum: { amount: true, receivedAmount: true },
        _count: true,
      }),

      // Overdue payables
      this.prisma.payable.findMany({
        where: {
          organizationId,
          status: AccountStatus.OVERDUE,
        },
        include: {
          vendor: { select: { name: true } },
          category: { select: { name: true, color: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // Overdue receivables
      this.prisma.receivable.findMany({
        where: {
          organizationId,
          status: AccountStatus.OVERDUE,
        },
        include: {
          customer: { select: { name: true } },
          category: { select: { name: true, color: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // Upcoming payables (next 7 days)
      this.prisma.payable.findMany({
        where: {
          organizationId,
          status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
          dueDate: { gte: today, lte: in7Days },
        },
        include: {
          vendor: { select: { name: true } },
          category: { select: { name: true, color: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // Upcoming receivables (next 7 days)
      this.prisma.receivable.findMany({
        where: {
          organizationId,
          status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
          dueDate: { gte: today, lte: in7Days },
        },
        include: {
          customer: { select: { name: true } },
          category: { select: { name: true, color: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
    ]);

    // Calculate totals
    const payableTotals = this.calculateTotals(payables);
    const receivableTotals = this.calculateTotals(receivables);

    return {
      payables: {
        totals: payableTotals,
        overdue: overduePayables,
        upcoming: upcomingPayables,
      },
      receivables: {
        totals: receivableTotals,
        overdue: overdueReceivables,
        upcoming: upcomingReceivables,
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

  private calculateTotals(grouped: GroupedItem[]) {
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

  // Cron job to update overdue status daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateOverdueStatus() {
    this.logger.log('Running overdue status update...');

    const payablesResult = await this.payablesService.updateOverdueStatus();
    const receivablesResult =
      await this.receivablesService.updateOverdueStatus();

    this.logger.log(
      `Updated ${payablesResult.count} payables and ${receivablesResult.count} receivables to OVERDUE status`
    );
  }
}
