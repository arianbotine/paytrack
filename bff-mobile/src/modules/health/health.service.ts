import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type ServiceStatus = 'ok' | 'unavailable';

interface ServiceHealth {
  status: ServiceStatus;
  detail?: string;
}

export interface HealthReport {
  status: ServiceStatus;
  services: {
    bff: ServiceHealth;
    backend: ServiceHealth;
  };
  timestamp: string;
}

const BACKEND_HEALTH_TIMEOUT_MS = 5_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly configService: ConfigService) {}

  async check(): Promise<HealthReport> {
    const [backendHealth] = await Promise.all([this.checkBackend()]);

    const bffHealth: ServiceHealth = { status: 'ok' };

    const overallStatus: ServiceStatus =
      bffHealth.status === 'ok' && backendHealth.status === 'ok'
        ? 'ok'
        : 'unavailable';

    return {
      status: overallStatus,
      services: {
        bff: bffHealth,
        backend: backendHealth,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkBackend(): Promise<ServiceHealth> {
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';

    try {
      await axios.get(`${backendUrl}/api/health`, {
        timeout: BACKEND_HEALTH_TIMEOUT_MS,
      });
      return { status: 'ok' };
    } catch (error: unknown) {
      const detail =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn(`Backend health check falhou: ${detail}`);
      return { status: 'unavailable', detail };
    }
  }
}
