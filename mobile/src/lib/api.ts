import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from './secure-storage';
import { useAuthStore } from './auth-store';

// BFF URL - change this based on your environment
const BFF_URL = process.env.EXPO_PUBLIC_BFF_URL || 'http://localhost:3001';

/**
 * Axios instance configured for the BFF API
 */
export const api = axios.create({
  baseURL: `${BFF_URL}/bff`,
  timeout: 70000, // 70s para suportar cold start do Render (~50s de inatividade)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - adds access token to all requests
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

/**
 * Response interceptor - handles token refresh on 401
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await secureStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Call refresh endpoint
        const response = await axios.post(`${BFF_URL}/bff/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);
        await secureStorage.setItem('refreshToken', newRefreshToken);

        processQueue(null, accessToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);

        // Logout user
        await useAuthStore.getState().logout();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
