import { Injectable, Logger } from '@nestjs/common';
import { GetDashboardSummaryUseCase } from './use-cases';

/**
 * Application Service: Dashboard
 * Responsabilidade: Coordenar use cases de dashboard
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly getDashboardSummaryUseCase: GetDashboardSummaryUseCase
  ) {}

  async getProjectionYears(organizationId: string) {
    return this.getDashboardSummaryUseCase.getProjectionYears(organizationId);
  }

  async getSummary(
    organizationId: string,
    startDate?: string,
    endDate?: string,
    projectionStartDate?: string,
    projectionEndDate?: string
  ) {
    return this.getDashboardSummaryUseCase.execute(
      organizationId,
      startDate,
      endDate,
      projectionStartDate,
      projectionEndDate
    );
  }
}
