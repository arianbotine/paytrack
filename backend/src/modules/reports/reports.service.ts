import { Injectable } from '@nestjs/common';
import {
  GetPaymentsReportUseCase,
  GetPaymentsReportDetailsUseCase,
  GetInstallmentItemsReportUseCase,
} from './use-cases';
import {
  PaymentsReportFilterDto,
  PaymentsReportResponseDto,
  PaymentsReportDetailsResponseDto,
  InstallmentItemsReportFilterDto,
  InstallmentItemsReportResponseDto,
} from './dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly getPaymentsReportUseCase: GetPaymentsReportUseCase,
    private readonly getPaymentsReportDetailsUseCase: GetPaymentsReportDetailsUseCase,
    private readonly getInstallmentItemsReportUseCase: GetInstallmentItemsReportUseCase
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
}
