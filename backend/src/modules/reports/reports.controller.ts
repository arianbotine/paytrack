import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import {
  PaymentsReportFilterDto,
  PaymentsReportResponseDto,
  PaymentsReportDetailsResponseDto,
  InstallmentItemsReportFilterDto,
  InstallmentItemsReportResponseDto,
} from './dto';

@ApiTags('Relatórios')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('payments')
  @ApiOperation({ summary: 'Relatório de pagamentos realizados' })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso',
    type: PaymentsReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async getPaymentsReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: PaymentsReportFilterDto
  ): Promise<PaymentsReportResponseDto> {
    return this.reportsService.getPaymentsReport(organizationId, filters);
  }

  @Get('payments/details')
  @ApiOperation({
    summary: 'Lista detalhada de transações do relatório de pagamentos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de transações gerada com sucesso',
    type: PaymentsReportDetailsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async getPaymentsReportDetails(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: PaymentsReportFilterDto
  ): Promise<PaymentsReportDetailsResponseDto> {
    return this.reportsService.getPaymentsReportDetails(
      organizationId,
      filters
    );
  }

  @Get('installment-items')
  @ApiOperation({ summary: 'Relatório de itens de parcelas por tag' })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso',
    type: InstallmentItemsReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async getInstallmentItemsReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsReportResponseDto> {
    return this.reportsService.getInstallmentItemsReport(
      organizationId,
      filters
    );
  }
}
