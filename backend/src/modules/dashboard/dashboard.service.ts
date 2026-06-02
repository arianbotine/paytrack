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

  async getSummary(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ) {
    return this.getDashboardSummaryUseCase.execute(
      organizationId,
      startDate,
      endDate
    );
  }
}
