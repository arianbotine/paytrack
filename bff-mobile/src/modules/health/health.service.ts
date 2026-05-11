import { Injectable } from '@nestjs/common';

export interface HealthReport {
  status: 'ok';
  timestamp: string;
}

@Injectable()
export class HealthService {
  check(): HealthReport {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
