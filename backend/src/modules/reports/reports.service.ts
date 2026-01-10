import { Injectable } from '@nestjs/common';
import { GetPaymentsReportUseCase } from './use-cases';
import { PaymentsReportFilterDto, PaymentsReportResponseDto } from './dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly getPaymentsReportUseCase: GetPaymentsReportUseCase
  ) {}

  async getPaymentsReport(
    organizationId: string,
    filters: PaymentsReportFilterDto
  ): Promise<PaymentsReportResponseDto> {
    return this.getPaymentsReportUseCase.execute(organizationId, filters);
  }
}
