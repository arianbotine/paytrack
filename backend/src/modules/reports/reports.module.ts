import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PaymentsReportsRepository } from './repositories';
import { PeriodCalculator, ReportCalculator } from './domain';
import {
  GetPaymentsReportUseCase,
  GetPaymentsReportDetailsUseCase,
} from './use-cases';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    PaymentsReportsRepository,
    PeriodCalculator,
    ReportCalculator,
    GetPaymentsReportUseCase,
    GetPaymentsReportDetailsUseCase,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
