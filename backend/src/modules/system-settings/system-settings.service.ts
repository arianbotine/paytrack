import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  SystemSettingsResponseDto,
  UpdateSystemSettingsDto,
} from './dto/system-settings.dto';

const GLOBAL_SETTINGS_ID = 'global';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SystemSettingsResponseDto> {
    const settings = await this.prisma.systemSettings.upsert({
      where: { id: GLOBAL_SETTINGS_ID },
      update: {},
      create: {
        id: GLOBAL_SETTINGS_ID,
        aiQueryChatEnabled: false,
      },
    });

    return {
      aiQueryChatEnabled: settings.aiQueryChatEnabled,
    };
  }

  async updateSettings(
    payload: UpdateSystemSettingsDto
  ): Promise<SystemSettingsResponseDto> {
    const settings = await this.prisma.systemSettings.upsert({
      where: { id: GLOBAL_SETTINGS_ID },
      update: {
        aiQueryChatEnabled: payload.aiQueryChatEnabled,
      },
      create: {
        id: GLOBAL_SETTINGS_ID,
        aiQueryChatEnabled: payload.aiQueryChatEnabled,
      },
    });

    return {
      aiQueryChatEnabled: settings.aiQueryChatEnabled,
    };
  }

  async ensureAiQueryChatEnabled(): Promise<void> {
    const settings = await this.getSettings();

    if (!settings.aiQueryChatEnabled) {
      throw new ServiceUnavailableException(
        'O chat analitico ainda nao esta disponivel.'
      );
    }
  }
}
