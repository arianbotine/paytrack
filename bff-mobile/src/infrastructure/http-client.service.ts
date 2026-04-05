import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

// Número máximo de tentativas ao backend antes de desistir
const BACKEND_MAX_RETRIES = 4;
// Intervalo entre tentativas (ms) — dá tempo ao backend acordar
const BACKEND_RETRY_DELAY_MS = 5_000;

function isConnectionError(error: AxiosError): boolean {
  if (error.response) return false; // tem resposta HTTP → não é erro de conexão
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

    // Interceptor de retry: tenta novamente em erros de conexão (backend acordando)
    this.client.interceptors.response.use(
      response => response,
      async (error: AxiosError & { _retryCount?: number }) => {
        if (error.response) {
          // Resposta HTTP com status de erro — encaminha diretamente ao app
          throw new HttpException(
            error.response.data || 'Backend error',
            error.response.status
          );
        }

        if (!isConnectionError(error)) {
          throw new HttpException(
            'Network error',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        // Erro de conexão — backend pode estar acordando
        const retryCount = error.config?._retryCount ?? 0;

        if (retryCount < BACKEND_MAX_RETRIES && error.config) {
          error.config._retryCount = retryCount + 1;
          this.logger.warn(
            `Backend connection error (${error.code}). ` +
              `Retrying ${error.config._retryCount}/${BACKEND_MAX_RETRIES} ` +
              `in ${BACKEND_RETRY_DELAY_MS}ms...`
          );
          await new Promise(resolve =>
            setTimeout(resolve, BACKEND_RETRY_DELAY_MS)
          );
          return this.client(error.config);
        }

        this.logger.error(
          `Backend unreachable after ${BACKEND_MAX_RETRIES} retries.`
        );
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
