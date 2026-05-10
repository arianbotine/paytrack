import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

// 'starting' indica cold start (ex: Render free tier acordando)
type ServiceStatus = 'ok' | 'unavailable' | 'starting';

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
const BACKEND_WAKEUP_TIMEOUT_MS = 60_000;

// Códigos HTTP que indicam cold start (proxy do Render durante wake-up)
const COLD_START_STATUS_CODES = new Set([429, 503]);

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private isWakingUp = false;

  constructor(private readonly configService: ConfigService) {}

  async check(): Promise<HealthReport> {
    const backendHealth = await this.checkBackend();
    const bffHealth: ServiceHealth = { status: 'ok' };

    const overallStatus: ServiceStatus =
      backendHealth.status === 'ok' ? 'ok' : backendHealth.status;

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
    const backendUrl = this.backendUrl;

    try {
      await axios.get(`${backendUrl}/api/health`, {
        timeout: BACKEND_HEALTH_TIMEOUT_MS,
      });
      this.isWakingUp = false;
      return { status: 'ok' };
    } catch (error: unknown) {
      return this.handleBackendError(error, backendUrl);
    }
  }

  private handleBackendError(
    error: unknown,
    backendUrl: string
  ): ServiceHealth {
    if (error instanceof AxiosError) {
      const statusCode = error.response?.status;

      if (statusCode !== undefined && COLD_START_STATUS_CODES.has(statusCode)) {
        this.logger.warn(
          `Backend retornou HTTP ${statusCode} — possível cold start`
        );
        this.triggerWakeUp(backendUrl);
        return { status: 'starting', detail: 'Backend está inicializando' };
      }

      const detail = statusCode
        ? `Backend retornou HTTP ${statusCode}`
        : (error.message ?? 'Erro de conexão');

      this.logger.warn(`Backend health check falhou: ${detail}`);
      this.triggerWakeUp(backendUrl);
      return { status: 'unavailable', detail };
    }

    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    this.logger.warn(`Backend health check falhou: ${detail}`);
    this.triggerWakeUp(backendUrl);
    return { status: 'unavailable', detail };
  }

  /**
   * Dispara uma requisição de wake-up em background com timeout generoso.
   * O flag `isWakingUp` evita múltiplas tentativas simultâneas.
   */
  private triggerWakeUp(backendUrl: string): void {
    if (this.isWakingUp) return;
    this.isWakingUp = true;

    this.logger.log('Disparando wake-up do backend...');

    axios
      .get(`${backendUrl}/api/health`, { timeout: BACKEND_WAKEUP_TIMEOUT_MS })
      .then(() => {
        this.logger.log('Backend acordou com sucesso');
      })
      .catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : 'Erro desconhecido';
        this.logger.warn(`Wake-up do backend falhou: ${detail}`);
      })
      .finally(() => {
        this.isWakingUp = false;
      });
  }

  private get backendUrl(): string {
    return (
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000'
    );
  }
}
