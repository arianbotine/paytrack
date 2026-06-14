import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SystemAdminGuard } from '../../shared/guards';
import {
  SystemSettingsResponseDto,
  UpdateSystemSettingsDto,
} from './dto/system-settings.dto';
import { SystemSettingsService } from './system-settings.service';

@ApiTags('System Settings')
@ApiBearerAuth()
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get('features')
  @ApiOperation({ summary: 'Obter feature flags globais disponiveis no app' })
  @ApiResponse({
    status: 200,
    description: 'Feature flags retornadas com sucesso',
    type: SystemSettingsResponseDto,
  })
  async getFeatureFlags(): Promise<SystemSettingsResponseDto> {
    return this.systemSettingsService.getSettings();
  }
}

@ApiTags('Admin - System Settings')
@ApiBearerAuth()
@Controller('admin/system-settings')
@UseGuards(SystemAdminGuard)
export class AdminSystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Obter configuracoes globais do sistema' })
  async getSettings(): Promise<SystemSettingsResponseDto> {
    return this.systemSettingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: '[Admin] Atualizar configuracoes globais do sistema' })
  async updateSettings(
    @Body() payload: UpdateSystemSettingsDto
  ): Promise<SystemSettingsResponseDto> {
    return this.systemSettingsService.updateSettings(payload);
  }
}
