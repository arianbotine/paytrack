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
  InstallmentItemsGroupedResponseDto,
  InstallmentItemsGroupedByTagResponseDto,
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

  @Get('installment-items/grouped')
  @ApiOperation({
    summary: 'Relatório de itens de parcelas por tag agrupados por descrição',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório agrupado gerado com sucesso',
    type: InstallmentItemsGroupedResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async getInstallmentItemsGroupedReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsGroupedResponseDto> {
    return this.reportsService.getInstallmentItemsGroupedReport(
      organizationId,
      filters
    );
  }

  @Get('installment-items/grouped-by-tag')
  @ApiOperation({
    summary: 'Totais de itens de parcelas agrupados por cada tag pesquisada',
  })
  @ApiResponse({
    status: 200,
    description: 'Totais por tag gerados com sucesso',
    type: InstallmentItemsGroupedByTagResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async getInstallmentItemsGroupedByTagReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsGroupedByTagResponseDto> {
    return this.reportsService.getInstallmentItemsGroupedByTagReport(
      organizationId,
      filters
    );
  }
}
