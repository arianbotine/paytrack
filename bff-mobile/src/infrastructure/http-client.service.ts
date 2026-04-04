import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * HTTP Client for calling the PayTrack Backend API.
 * Acts as a proxy, forwarding the access token from the mobile app.
 */
@Injectable()
export class HttpClientService {
  private readonly client: AxiosInstance;

  constructor(private configService: ConfigService) {
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';

    this.client = axios.create({
      baseURL: `${backendUrl}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response) {
          // Forward backend errors to the mobile app
          throw new HttpException(
            error.response.data || 'Backend error',
            error.response.status
          );
        }
        if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Backend service unavailable',
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
        throw new HttpException(
          'Network error',
          HttpStatus.INTERNAL_SERVER_ERROR
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
