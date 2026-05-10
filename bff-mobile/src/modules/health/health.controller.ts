import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

const STATUS_CODE_MAP: Record<string, HttpStatus> = {
  ok: HttpStatus.OK,
  starting: HttpStatus.ACCEPTED, // 202: backend acordando, tente novamente
  unavailable: HttpStatus.SERVICE_UNAVAILABLE, // 503
};

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const report = await this.healthService.check();
    const statusCode =
      STATUS_CODE_MAP[report.status] ?? HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(report);
  }
}
