import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

// "starting" indica cold start (ex: Render free tier acordando)
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

// Timeout curto para o health check — responde imediatamente ao app mobile
const BACKEND_HEALTH_TIMEOUT_MS = 5_000;

// Timeout longo para o wake-up: o Render segura a primeira conexão externa
// até o serviço acordar (~50s). Uma única requisição de 70s é suficiente
// e evita o rate-limit (429) causado por múltiplas tentativas simultâneas.
// Render docs: free services can't receive private network traffic — o
// wake-up PRECISA ir pelo URL público (BACKEND_WAKEUP_URL).
const WAKEUP_TIMEOUT_MS = 70_000;

// Codigos HTTP que indicam cold start do Render proxy
const COLD_START_HTTP_CODES = new Set([429, 502, 503, 504]);

// Codigos de rede que indicam que o servico ainda nao respondeu
const COLD_START_NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNABORTED',
  'ERR_NETWORK',
  'ENOTFOUND',
]);

function isColdStartError(error: AxiosError): boolean {
  if (error.response) {
    return COLD_START_HTTP_CODES.has(error.response.status);
  }
  return (
    COLD_START_NETWORK_CODES.has(error.code ?? '') ||
    (error.message?.toLowerCase().includes('timeout') ?? false)
  );
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  // Previne multiplos wake-ups simultaneos (causariam rate-limit 429 no Render)
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
      if (error instanceof AxiosError && isColdStartError(error)) {
        const cause = error.response
          ? `HTTP ${error.response.status}`
          : (error.code ?? 'timeout/network');
        this.logger.warn(
          `Backend indisponivel (${cause}) — cold start detectado`
        );
        this.triggerWakeUp();
        return { status: 'starting', detail: 'Backend esta inicializando' };
      }

      const detail =
        error instanceof AxiosError && error.response
          ? `Backend retornou HTTP ${error.response.status}`
          : error instanceof Error
            ? error.message
            : 'Erro desconhecido';

      this.logger.warn(`Backend health check falhou: ${detail}`);
      return { status: 'unavailable', detail };
    }
  }

  /**
   * Dispara UMA UNICA requisicao de longa duracao (70s) pelo URL publico do backend.
   *
   * Por que uma unica requisicao e nao um loop?
   * - Render free tier: o proxy publico segura a primeira conexao externa ate o
   *   servico acordar (~50s) e entao responde normalmente.
   * - Um loop de tentativas curtas dispara o "service-initiated traffic threshold"
   *   do Render, resultando em 429 (rate-limit).
   * - Free services nao podem receber trafego de rede privada, portanto o
   *   wake-up DEVE usar o URL publico (BACKEND_WAKEUP_URL).
   *
   * Referencia: https://render.com/docs/free#spinning-down-on-idle
   */
  private triggerWakeUp(): void {
    if (this.isWakingUp) return;
    this.isWakingUp = true;

    const backendUrl = this.backendUrl;
    this.logger.log(`Iniciando wake-up: ${backendUrl}`);

    axios
      .get(`${backendUrl}/api/health`, {
        timeout: WAKEUP_TIMEOUT_MS,
        // User-Agent de browser para garantir que o Render trate como trafego externo
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; PayTrackBFF/1.0; +health-wakeup)',
        },
      })
      .then(() => {
        this.logger.log('Backend acordou com sucesso');
      })
      .catch((err: unknown) => {
        const cause =
          err instanceof AxiosError
            ? err.response
              ? `HTTP ${err.response.status}`
              : (err.code ?? err.message ?? 'desconhecido')
            : 'desconhecido';
        this.logger.warn(`Wake-up falhou (${cause})`);
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
