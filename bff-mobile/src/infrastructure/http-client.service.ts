import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

// Número máximo de tentativas ao backend antes de desistir
// 10 tentativas × 6s = 60s — cobre o cold start do Render (~50s)
const BACKEND_MAX_RETRIES = 10;
// Intervalo entre tentativas (ms)
const BACKEND_RETRY_DELAY_MS = 6_000;

// Status HTTP que indicam cold start em cascata (Render proxy / backend acordando)
const RETRIABLE_HTTP_STATUSES = new Set([502, 503, 504]);

function isRetriableBackendError(error: AxiosError): boolean {
  // HTTP 502/503/504 = Render retornou erro enquanto o backend acorda
  if (error.response) {
    return RETRIABLE_HTTP_STATUSES.has(error.response.status);
  }
  // Erros de conexão = backend ainda não está acessível
  return (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ENOTFOUND' ||
    (error.message?.toLowerCase().includes('timeout') ?? false)
  );
}

/**
 * HTTP Client for calling the PayTrack Backend API.
 * Acts as a proxy, forwarding the access token from the mobile app.
 */
@Injectable()
export class HttpClientService {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(HttpClientService.name);

  constructor(private configService: ConfigService) {
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';

    this.client = axios.create({
      baseURL: `${backendUrl}/api`,
      // 70s — comporta o cold start do Render (~50s) com margem
      timeout: 70_000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor de retry: tenta novamente tanto em erros de conexão quanto
    // em respostas HTTP 502/503/504 (Render proxy devolvendo erro enquanto
    // o backend acorda — cold start em cascata BFF → backend).
    this.client.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        if (!isRetriableBackendError(error)) {
          // Erro não-retriável (400, 401, 403, 500…) — encaminha ao app
          if (error.response) {
            throw new HttpException(
              error.response.data || 'Backend error',
              error.response.status
            );
          }
          throw new HttpException(
            'Network error',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        // Erro retriável — backend pode estar acordando no Render
        const config = error.config as RetryConfig | undefined;
        const retryCount = config?._retryCount ?? 0;

        if (retryCount < BACKEND_MAX_RETRIES && config) {
          config._retryCount = retryCount + 1;
          const cause = error.response
            ? `HTTP ${error.response.status}`
            : error.code;
          this.logger.warn(
            `Backend indisponível (${cause}). ` +
              `Retry ${config._retryCount}/${BACKEND_MAX_RETRIES} ` +
              `em ${BACKEND_RETRY_DELAY_MS}ms...`
          );
          await new Promise(resolve =>
            setTimeout(resolve, BACKEND_RETRY_DELAY_MS)
          );
          return this.client(config);
        }

        this.logger.error(
          `Backend inacessível após ${BACKEND_MAX_RETRIES} tentativas.`
        );
        if (error.response) {
          throw new HttpException(
            error.response.data || 'Backend service unavailable',
            error.response.status
          );
        }
        throw new HttpException(
          'Backend service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    );
  }

  /**
   * Make a GET request to the backend
   */
  async get<T>(
    url: string,
    accessToken?: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.get<T>(url, {
      ...config,
      headers: {
        ...config?.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });
    return response.data;
  }

  /**
   * Make a POST request to the backend
   */
  async post<T>(
    url: string,
    data?: unknown,
    accessToken?: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });
    return response.data;
  }

  /**
   * Make a PATCH request to the backend
   */
  async patch<T>(
    url: string,
    data?: unknown,
    accessToken?: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });
    return response.data;
  }

  /**
   * Make a POST request and return both data and response headers.
   * Used when the caller needs to inspect Set-Cookie headers (e.g., auth endpoints).
   */
  async postWithHeaders<T>(
    url: string,
    data?: unknown,
    accessToken?: string,
    config?: AxiosRequestConfig
  ): Promise<{ data: T; setCookie: string | string[] | undefined }> {
    const response = await this.client.post<T>(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });
    return {
      data: response.data,
      setCookie: response.headers['set-cookie'],
    };
  }

  /**
   * Make a DELETE request to the backend
   */
  async delete<T>(
    url: string,
    accessToken?: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.delete<T>(url, {
      ...config,
      headers: {
        ...config?.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });
    return response.data;
  }
}
