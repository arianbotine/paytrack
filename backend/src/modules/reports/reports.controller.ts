import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { PaymentsReportFilterDto, PaymentsReportResponseDto } from './dto';

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
}
