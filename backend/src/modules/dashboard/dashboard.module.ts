import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PayablesModule } from '../payables/payables.module';
import { ReceivablesModule } from '../receivables/receivables.module';
import { DashboardCalculator, DateRangeCalculator } from './domain';
import { GetDashboardSummaryUseCase } from './use-cases';
import { DashboardRepository } from './repositories';

@Module({
  imports: [PayablesModule, ReceivablesModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    // Repositories
    DashboardRepository,
    // Domain Services
    DashboardCalculator,
    DateRangeCalculator,
    // Use Cases
    GetDashboardSummaryUseCase,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
