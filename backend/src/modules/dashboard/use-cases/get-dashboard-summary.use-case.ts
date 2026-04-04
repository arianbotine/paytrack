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

  async execute(organizationId: string, startDate?: string, endDate?: string) {
    const cacheKey = `dashboard:summary:${organizationId}:${startDate || 'default'}:${endDate || 'default'}`;
    const cacheTTL = Number.parseInt(
      process.env.CACHE_TTL_DASHBOARD || '300',
      10
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.generateSummary(organizationId, startDate, endDate),
      cacheTTL
    );
  }

  private async generateSummary(
    organizationId: string,
    startDateStr?: string,
    endDateStr?: string
  ) {
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

    // Período para "Pago no período" / "Recebido no período":
    // usa as datas enviadas pelo frontend (já em UTC, convertidas do fuso local),
    // ou o mês vigente UTC como fallback.
    const paidPeriodStart = startDateStr
      ? new Date(startDateStr)
      : startOfCurrentMonth;
    const paidPeriodEnd = endDateStr ? new Date(endDateStr) : endOfCurrentMonth;

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
      paidAmounts,
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
      this.repository.getPaidAmountsByPeriod(
        organizationId,
        paidPeriodStart,
        paidPeriodEnd
      ),
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

    const currentToReceive =
      this.dashboardCalculator.calculateToReceive(receivableTotals);
    const currentToPay = this.dashboardCalculator.calculateToPay(payableTotals);

    const totalToReceive =
      this.dashboardCalculator.calculateToReceive(allReceivableTotals);
    const totalToPay =
      this.dashboardCalculator.calculateToPay(allPayableTotals);
    const totalNetBalance = this.dashboardCalculator.calculateNetBalance(
      totalToReceive,
      totalToPay
    );

    return {
      payableInstallments: {
        totals: payableTotals,
        toPay: currentToPay,
        overdue: overduePayableInstallments,
        upcoming: upcomingPayableInstallments,
      },
      receivableInstallments: {
        totals: receivableTotals,
        toReceive: currentToReceive,
        overdue: overdueReceivableInstallments,
        upcoming: upcomingReceivableInstallments,
      },
      balance: {
        toReceive: totalToReceive,
        toPay: totalToPay,
        net: totalNetBalance,
      },
      paidInPeriod: paidAmounts.paid,
      receivedInPeriod: paidAmounts.received,
    };
  }
}
