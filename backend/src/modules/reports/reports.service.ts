import { Injectable } from '@nestjs/common';
import {
  GetPaymentsReportUseCase,
  GetPaymentsReportDetailsUseCase,
  GetInstallmentItemsReportUseCase,
  GetInstallmentItemsGroupedReportUseCase,
} from './use-cases';
import {
  PaymentsReportFilterDto,
  PaymentsReportResponseDto,
  PaymentsReportDetailsResponseDto,
  InstallmentItemsReportFilterDto,
  InstallmentItemsReportResponseDto,
  InstallmentItemsGroupedResponseDto,
} from './dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly getPaymentsReportUseCase: GetPaymentsReportUseCase,
    private readonly getPaymentsReportDetailsUseCase: GetPaymentsReportDetailsUseCase,
    private readonly getInstallmentItemsReportUseCase: GetInstallmentItemsReportUseCase,
    private readonly getInstallmentItemsGroupedReportUseCase: GetInstallmentItemsGroupedReportUseCase
  ) {}

  async getPaymentsReport(
    organizationId: string,
    filters: PaymentsReportFilterDto
  ): Promise<PaymentsReportResponseDto> {
    return this.getPaymentsReportUseCase.execute(organizationId, filters);
  }

  async getPaymentsReportDetails(
    organizationId: string,
    filters: PaymentsReportFilterDto
  ): Promise<PaymentsReportDetailsResponseDto> {
    return this.getPaymentsReportDetailsUseCase.execute(
      organizationId,
      filters
    );
  }

  async getInstallmentItemsReport(
    organizationId: string,
    filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsReportResponseDto> {
    return this.getInstallmentItemsReportUseCase.execute(
      organizationId,
      filters
    );
  }

  async getInstallmentItemsGroupedReport(
    organizationId: string,
    filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsGroupedResponseDto> {
    return this.getInstallmentItemsGroupedReportUseCase.execute(
      organizationId,
      filters
    );
  }
}
