import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";

// "starting" indica cold start (ex: Render free tier acordando)
type ServiceStatus = "ok" | "unavailable" | "starting";

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

// Timeout do health check rapido -- responde imediatamente ao app
const BACKEND_HEALTH_TIMEOUT_MS = 5_000;

// Configuracao do retry loop de wake-up
// 10 tentativas x (10s timeout + 6s delay) aprox 160s max, cobre o cold start do Render (~50s)
const WAKEUP_MAX_ATTEMPTS = 10;
const WAKEUP_ATTEMPT_TIMEOUT_MS = 10_000;
const WAKEUP_RETRY_DELAY_MS = 6_000;

// Codigos HTTP que indicam cold start (proxy do Render durante wake-up)
const COLD_START_HTTP_CODES = new Set([429, 503, 502, 504]);

// Codigos de erro de rede/conexao que tambem indicam cold start
const COLD_START_NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNABORTED",
  "ERR_NETWORK",
  "ENOTFOUND",
]);

function isColdStartError(error: AxiosError): boolean {
  if (error.response) {
    return COLD_START_HTTP_CODES.has(error.response.status);
  }
  return (
    COLD_START_NETWORK_CODES.has(error.code ?? "") ||
    (error.message?.toLowerCase().includes("timeout") ?? false)
  );
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  // Previne multiplos loops de wake-up simultaneos entre requests concorrentes
  private isWakingUp = false;

  constructor(private readonly configService: ConfigService) {}

  async check(): Promise<HealthReport> {
    const backendHealth = await this.checkBackend();
    const bffHealth: ServiceHealth = { status: "ok" };

    const overallStatus: ServiceStatus =
      backendHealth.status === "ok" ? "ok" : backendHealth.status;

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
      return { status: "ok" };
    } catch (error: unknown) {
      if (error instanceof AxiosError && isColdStartError(error)) {
        const cause = error.response
          ? `HTTP ${error.response.status}`
          : (error.code ?? "timeout");
        this.logger.warn(`Backend indisponivel (${cause}) -- iniciando wake-up`);
        this.triggerWakeUp(backendUrl);
        return { status: "starting", detail: "Backend esta inicializando" };
      }

      const detail =
        error instanceof AxiosError && error.response
          ? `Backend retornou HTTP ${error.response.status}`
          : error instanceof Error
            ? error.message
            : "Erro desconhecido";

      this.logger.warn(`Backend health check falhou: ${detail}`);
      return { status: "unavailable", detail };
    }
  }

  /**
   * Inicia um loop de retry em background para acordar o backend no Render.
   * O flag isWakingUp garante que apenas um loop esteja ativo por vez,
   * evitando multiplas requisicoes simultaneas que poderiam causar rate limit (429).
   */
  private triggerWakeUp(backendUrl: string): void {
    if (this.isWakingUp) return;
    this.isWakingUp = true;

    this.runWakeUpLoop(backendUrl).catch(() => {
      this.isWakingUp = false;
    });
  }

  private async runWakeUpLoop(backendUrl: string): Promise<void> {
    this.logger.log("Wake-up loop iniciado...");

    for (let attempt = 1; attempt <= WAKEUP_MAX_ATTEMPTS; attempt++) {
      try {
        await axios.get(`${backendUrl}/api/health`, {
          timeout: WAKEUP_ATTEMPT_TIMEOUT_MS,
        });
        this.logger.log("Backend acordou com sucesso");
        this.isWakingUp = false;
        return;
      } catch (err: unknown) {
        const cause =
          err instanceof AxiosError
            ? (err.response ? `HTTP ${err.response.status}` : (err.code ?? "timeout"))
            : "erro desconhecido";

        if (attempt < WAKEUP_MAX_ATTEMPTS) {
          this.logger.warn(
            `Wake-up tentativa ${attempt}/${WAKEUP_MAX_ATTEMPTS} falhou (${cause}). ` +
              `Aguardando ${WAKEUP_RETRY_DELAY_MS}ms...`,
          );
          await new Promise<void>(resolve =>
            setTimeout(resolve, WAKEUP_RETRY_DELAY_MS),
          );
        } else {
          this.logger.error(
            `Backend nao acordou apos ${WAKEUP_MAX_ATTEMPTS} tentativas. Ultima causa: ${cause}`,
          );
        }
      }
    }

    this.isWakingUp = false;
  }

  private get backendUrl(): string {
    return (
      this.configService.get<string>("BACKEND_URL") || "http://localhost:3000"
    );
  }
}
