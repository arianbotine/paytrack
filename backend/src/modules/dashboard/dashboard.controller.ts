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

  @Get('projection-years')
  @ApiOperation({ summary: 'Listar anos com contas para a projeção' })
  async getProjectionYears(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.dashboardService.getProjectionYears(organizationId);
  }

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
  @ApiQuery({
    name: 'projectionStartDate',
    required: false,
    description: 'Início do período em UTC ISO para o saldo projetado',
  })
  @ApiQuery({
    name: 'projectionEndDate',
    required: false,
    description: 'Fim do período em UTC ISO para o saldo projetado',
  })
  async getSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('projectionStartDate') projectionStartDate?: string,
    @Query('projectionEndDate') projectionEndDate?: string
  ) {
    return this.dashboardService.getSummary(
      organizationId,
      startDate,
      endDate,
      projectionStartDate,
      projectionEndDate
    );
  }
}
