import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators';
import { DueAlertsFilterDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notificações')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('due-alerts')
  @ApiOperation({
    summary: 'Listar alertas de contas vencidas e próximas ao vencimento',
  })
  async getDueAlerts(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: DueAlertsFilterDto
  ) {
    return this.notificationsService.getDueAlerts(organizationId, query.limit);
  }
}
