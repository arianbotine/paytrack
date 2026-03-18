import { Injectable } from '@nestjs/common';
import {
  GetPaymentsReportUseCase,
  GetPaymentsReportDetailsUseCase,
} from './use-cases';
import {
  PaymentsReportFilterDto,
  PaymentsReportResponseDto,
  PaymentsReportDetailsResponseDto,
} from './dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly getPaymentsReportUseCase: GetPaymentsReportUseCase,
    private readonly getPaymentsReportDetailsUseCase: GetPaymentsReportDetailsUseCase
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
}
