import { Module } from '@nestjs/common';
import { AiQueryController } from './ai-query.controller';
import { AiQueryService } from './ai-query.service';
import { SystemSettingsModule } from '../system-settings';

@Module({
  imports: [SystemSettingsModule],
  controllers: [AiQueryController],
  providers: [AiQueryService],
  exports: [AiQueryService],
})
export class AiQueryModule {}
