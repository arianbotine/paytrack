import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../shared/decorators';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Obter resumo do dashboard' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Início do período em UTC ISO (para cards Pago/Recebido)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Fim do período em UTC ISO (para cards Pago/Recebido)',
  })
  async getSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.dashboardService.getSummary(organizationId, startDate, endDate);
  }
}
