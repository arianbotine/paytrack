import { Module, Global } from '@nestjs/common';
import { HealthController } from './health.controller';

@Global()
@Module({
  controllers: [HealthController],
  exports: [],
})
export class SharedModule {}
