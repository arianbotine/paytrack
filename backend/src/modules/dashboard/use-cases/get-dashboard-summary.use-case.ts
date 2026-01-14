import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/services/cache.service';
import { DashboardCalculator, DateRangeCalculator } from '../domain';
import { DashboardRepository } from '../repositories';

/**
 * Use Case: Obter resumo do dashboard
 * Responsabilidade: Orquestrar queries e cálculos para o dashboard
 */
@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly dashboardCalculator: DashboardCalculator,
    private readonly dateRangeCalculator: DateRangeCalculator,
    private readonly cacheService: CacheService
  ) {}

  async execute(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    const cacheTTL = Number.parseInt(
      process.env.CACHE_TTL_DASHBOARD || '300',
      10
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.generateSummary(organizationId),
      cacheTTL
    );
  }

  private async generateSummary(organizationId: string) {
    // Calcular datas usando DateRangeCalculator
    const todayUTC = this.dateRangeCalculator.getTodayUTC();
    const startOfCurrentMonth =
      this.dateRangeCalculator.getStartOfCurrentMonth();
    const endOfCurrentMonth = this.dateRangeCalculator.getEndOfCurrentMonth();
    const in7Days = this.dateRangeCalculator.addDays(todayUTC, 7);
    const upcomingDeadline = this.dateRangeCalculator.min(
      in7Days,
      endOfCurrentMonth
    );

    // Executar queries em paralelo através do repository
    const [
      payableInstallments,
      receivableInstallments,
      overduePayableInstallments,
      overdueReceivableInstallments,
      upcomingPayableInstallments,
      upcomingReceivableInstallments,
      allPayableInstallments,
      allReceivableInstallments,
    ] = await Promise.all([
      this.repository.getPayableInstallmentsSummary(
        organizationId,
        startOfCurrentMonth,
        endOfCurrentMonth
      ),
      this.repository.getReceivableInstallmentsSummary(
        organizationId,
        startOfCurrentMonth,
        endOfCurrentMonth
      ),
      this.repository.getOverduePayableInstallments(
        organizationId,
        startOfCurrentMonth,
        todayUTC
      ),
      this.repository.getOverdueReceivableInstallments(
        organizationId,
        startOfCurrentMonth,
        todayUTC
      ),
      this.repository.getUpcomingPayableInstallments(
        organizationId,
        todayUTC,
        upcomingDeadline
      ),
      this.repository.getUpcomingReceivableInstallments(
        organizationId,
        todayUTC,
        upcomingDeadline
      ),
      this.repository.getAllPayableInstallmentsSummary(organizationId),
      this.repository.getAllReceivableInstallmentsSummary(organizationId),
    ]);

    // Calcular totais usando DashboardCalculator
    const payableTotals =
      this.dashboardCalculator.calculateTotals(payableInstallments);
    const receivableTotals = this.dashboardCalculator.calculateTotals(
      receivableInstallments
    );
    const allPayableTotals = this.dashboardCalculator.calculateTotals(
      allPayableInstallments
    );
    const allReceivableTotals = this.dashboardCalculator.calculateTotals(
      allReceivableInstallments
    );

    const toReceive =
      this.dashboardCalculator.calculateToReceive(allReceivableTotals);
    const toPay = this.dashboardCalculator.calculateToPay(allPayableTotals);
    const netBalance = this.dashboardCalculator.calculateNetBalance(
      toReceive,
      toPay
    );

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
        toReceive,
        toPay,
        net: netBalance,
      },
    };
  }
}
