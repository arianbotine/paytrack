import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../shared/services/cache.service';
import { GetDashboardSummaryUseCase } from './use-cases';

/**
 * Application Service: Dashboard
 * Responsabilidade: Coordenar use cases de dashboard
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly getDashboardSummaryUseCase: GetDashboardSummaryUseCase,
    private readonly cacheService: CacheService
  ) {}

  async getSummary(organizationId: string) {
    return this.getDashboardSummaryUseCase.execute(organizationId);
  }

  invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    this.cacheService.del(cacheKey);
  }
}
