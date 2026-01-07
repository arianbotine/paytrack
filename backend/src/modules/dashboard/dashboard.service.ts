import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayablesService } from '../payables/payables.service';
import { ReceivablesService } from '../receivables/receivables.service';
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
    private readonly payablesService: PayablesService,
    private readonly receivablesService: ReceivablesService,
    private readonly cacheService: CacheService
  ) {}

  async getSummary(organizationId: string) {
    return this.getDashboardSummaryUseCase.execute(organizationId);
  }

  invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    this.cacheService.del(cacheKey);
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
