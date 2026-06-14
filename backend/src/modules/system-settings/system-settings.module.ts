import { Module } from '@nestjs/common';
import {
  AdminSystemSettingsController,
  SystemSettingsController,
} from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';

@Module({
  controllers: [SystemSettingsController, AdminSystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
