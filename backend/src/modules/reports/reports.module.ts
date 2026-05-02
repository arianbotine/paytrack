import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import {
  PaymentsReportsRepository,
  InstallmentItemsReportRepository,
} from './repositories';
import { PeriodCalculator, ReportCalculator } from './domain';
import {
  GetPaymentsReportUseCase,
  GetPaymentsReportDetailsUseCase,
  GetInstallmentItemsReportUseCase,
} from './use-cases';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    PaymentsReportsRepository,
    InstallmentItemsReportRepository,
    PeriodCalculator,
    ReportCalculator,
    GetPaymentsReportUseCase,
    GetPaymentsReportDetailsUseCase,
    GetInstallmentItemsReportUseCase,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
