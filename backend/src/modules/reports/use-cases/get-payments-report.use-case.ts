import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentsReportsRepository } from '../repositories';
import { PeriodCalculator, ReportCalculator } from '../domain';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import {
  PaymentsReportFilterDto,
  PaymentsReportResponseDto,
  ComparisonDto,
} from '../dto';

@Injectable()
export class GetPaymentsReportUseCase {
  constructor(
    private readonly repository: PaymentsReportsRepository,
    private readonly periodCalculator: PeriodCalculator,
    private readonly reportCalculator: ReportCalculator
  ) {}

  async execute(
    organizationId: string,
    filters: PaymentsReportFilterDto
  ): Promise<PaymentsReportResponseDto> {
    // Validar que startDate e endDate foram fornecidos
    if (!filters.startDate || !filters.endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    // Normalizar datas para início e fim do dia
    const startDate = new Date(filters.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Validate max period (365 days)
    this.periodCalculator.validateMaxPeriod(startDate, endDate);

    // Calculate previous period
    const previousPeriod = this.periodCalculator.getPreviousPeriod(
      startDate,
      endDate
    );

    // Fetch data in parallel
    const [
      currentTimeSeries,
      previousTimeSeries,
      categoryBreakdown,
      methodBreakdown,
    ] = await Promise.all([
      this.repository.getPaymentsTimeSeries(
        organizationId,
        startDate,
        endDate,
        filters.groupBy || 'month',
        filters
      ),
      this.repository.getPaymentsTimeSeries(
        organizationId,
        previousPeriod.start,
        previousPeriod.end,
        filters.groupBy || 'month',
        filters
      ),
      this.repository.getBreakdownByCategory(
        organizationId,
        startDate,
        endDate,
        filters.skip || 0,
        filters.take || 10,
        filters
      ),
      this.repository.getBreakdownByPaymentMethod(
        organizationId,
        startDate,
        endDate,
        filters.skip || 0,
        filters.take || 10,
        filters
      ),
    ]);

    // Calculate totals
    const currentTotals = this.calculateTotals(currentTimeSeries);
    const previousTotals = this.calculateTotals(previousTimeSeries);

    // Calculate comparisons
    const totals = {
      payables: this.createComparison(
        currentTotals.payables,
        previousTotals.payables
      ),
      receivables: this.createComparison(
        currentTotals.receivables,
        previousTotals.receivables
      ),
      netBalance: this.createComparison(
        this.reportCalculator.calculateNetBalance(
          currentTotals.receivables,
          currentTotals.payables
        ),
        this.reportCalculator.calculateNetBalance(
          previousTotals.receivables,
          previousTotals.payables
        )
      ),
      transactions: this.createComparison(
        currentTotals.count,
        previousTotals.count
      ),
    };

    // Calculate percentages for breakdown
    const categoryTotal = categoryBreakdown.data.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const methodTotal = methodBreakdown.data.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    const categoryBreakdownWithPercentage = categoryBreakdown.data.map(
      item => ({
        ...item,
        amount: MoneyUtils.toNumber(item.amount),
        percentage: this.reportCalculator.calculatePercentage(
          Number(item.amount),
          categoryTotal
        ),
        count: Number(item.count),
      })
    );

    const methodBreakdownWithPercentage = methodBreakdown.data.map(item => ({
      ...item,
      amount: MoneyUtils.toNumber(item.amount),
      percentage: this.reportCalculator.calculatePercentage(
        Number(item.amount),
        methodTotal
      ),
      count: Number(item.count),
    }));

    // Transform money fields in time series
    const transformedTimeSeries = currentTimeSeries.map(item => ({
      period: item.period.toISOString(),
      payables: MoneyUtils.toNumber(item.payables),
      receivables: MoneyUtils.toNumber(item.receivables),
      count: Number(item.count),
    }));

    const response: PaymentsReportResponseDto = {
      timeSeries: transformedTimeSeries,
      totals,
      breakdown: {
        byCategory: {
          data: categoryBreakdownWithPercentage,
          total: categoryBreakdown.total,
        },
        byPaymentMethod: {
          data: methodBreakdownWithPercentage,
          total: methodBreakdown.total,
        },
      },
    };

    return response;
  }

  private calculateTotals(timeSeries: any[]): {
    payables: number;
    receivables: number;
    count: number;
  } {
    return timeSeries.reduce(
      (acc, item) => ({
        payables: acc.payables + Number(item.payables),
        receivables: acc.receivables + Number(item.receivables),
        count: acc.count + Number(item.count),
      }),
      { payables: 0, receivables: 0, count: 0 }
    );
  }

  private createComparison(current: number, previous: number): ComparisonDto {
    return {
      current,
      previous,
      variance: this.reportCalculator.calculateVariance(current, previous),
    };
  }
}
