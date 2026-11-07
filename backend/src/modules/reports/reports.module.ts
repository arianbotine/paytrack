import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import {
  PaymentsReportsRepository,
  InstallmentItemsReportRepository,
  PendingAccountsReportRepository,
} from './repositories';
import { PeriodCalculator, ReportCalculator } from './domain';
import {
  GetPaymentsReportUseCase,
  GetPaymentsReportDetailsUseCase,
  GetInstallmentItemsReportUseCase,
  GetInstallmentItemsGroupedReportUseCase,
  GetInstallmentItemsGroupedByTagReportUseCase,
  GetPendingAccountsReportUseCase,
} from './use-cases';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    PaymentsReportsRepository,
    InstallmentItemsReportRepository,
    PendingAccountsReportRepository,
    PeriodCalculator,
    ReportCalculator,
    GetPaymentsReportUseCase,
    GetPaymentsReportDetailsUseCase,
    GetInstallmentItemsReportUseCase,
    GetInstallmentItemsGroupedReportUseCase,
    GetInstallmentItemsGroupedByTagReportUseCase,
    GetPendingAccountsReportUseCase,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
