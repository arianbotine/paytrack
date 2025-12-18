import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // Enable cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

// Server wakeup retry configuration
const MAX_WAKEUP_RETRIES = 15; // Up to ~75 seconds of retries
const WAKEUP_RETRY_DELAY = 5000; // 5 seconds between retries
let wakeupRetryCount = 0;
let wakeupRetryTimeout: number | null = null;

// Function to check if error indicates cold server
const isColdServerError = (error: any): boolean => {
  // Network errors (server not responding)
  if (!error.response && error.code === 'ERR_NETWORK') {
    return true;
  }

  // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
  const status = error.response?.status;
  return status === 502 || status === 503 || status === 504;
};

// Function to retry request with exponential backoff
const retryWithWakeup = async (originalRequest: any): Promise<any> => {
  const uiStore = useUIStore.getState();

  if (wakeupRetryCount === 0) {
    // First retry - show wakeup dialog
    uiStore.setServerWaking(true);
  }

  wakeupRetryCount++;
  uiStore.incrementRetryAttempt();

  if (wakeupRetryCount >= MAX_WAKEUP_RETRIES) {
    // Max retries reached
    wakeupRetryCount = 0;
    uiStore.setServerWaking(false);
    uiStore.showNotification(
      'O servidor está demorando mais que o esperado. Por favor, tente novamente em alguns instantes.',
      'error'
    );
    throw new Error('Server wakeup timeout');
  }

  // Wait before retrying
  await new Promise(resolve => {
    wakeupRetryTimeout = setTimeout(resolve, WAKEUP_RETRY_DELAY);
  });

  try {
    const response = await api(originalRequest);
    // Success! Reset everything
    wakeupRetryCount = 0;
    uiStore.setServerWaking(false);
    uiStore.resetRetryAttempt();
    if (wakeupRetryTimeout) {
      clearTimeout(wakeupRetryTimeout);
      wakeupRetryTimeout = null;
    }
    return response;
  } catch (retryError: any) {
    if (isColdServerError(retryError)) {
      // Server still waking up, retry again
      return retryWithWakeup(originalRequest);
    }
    // Different error, stop retrying
    wakeupRetryCount = 0;
    uiStore.setServerWaking(false);
    uiStore.resetRetryAttempt();
    throw retryError;
  }
};

// Request interceptor - cookies are sent automatically
api.interceptors.request.use(
  config => {
    // Adicionar idempotency-key para requests POST, PUT, PATCH
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
      // Verificar se já existe (setado manualmente)
      let idempotencyKey = (globalThis as any).__IDEMPOTENCY_KEY__;

      // Se não existe, gerar automaticamente
      if (!idempotencyKey) {
        idempotencyKey = uuidv4();
      }

      config.headers['idempotency-key'] = idempotencyKey;

      // Limpar se foi gerado automaticamente (não manual)
      if (!(globalThis as any).__IDEMPOTENCY_KEY_MANUAL__) {
        delete (globalThis as any).__IDEMPOTENCY_KEY__;
      }
    }

    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Check for cold server (needs wakeup)
    if (isColdServerError(error) && !originalRequest._wakeupRetry) {
      originalRequest._wakeupRetry = true;
      return retryWithWakeup(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      const requestUrl = originalRequest.url || '';

      // Don't auto-logout for auth-related requests (login, refresh)
      const isAuthRequest =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/refresh');

      if (isAuthRequest) {
        // For auth requests, just throw the error without logout
        throw error;
      }

      // Check if we have any auth cookies
      const hasAuthCookies = document.cookie.includes('accessToken');

      // If user is not authenticated in store or no auth cookies, immediately logout
      if (!isAuthenticated || !hasAuthCookies) {
        useAuthStore.getState().logout();
        globalThis.location.href = '/login';
        throw error;
      }

      // If user appears authenticated but token expired, try refresh
      if (isRefreshing) {
        // If refresh is already in progress, wait for it
        try {
          await refreshPromise;
          // Retry original request with new cookie
          return api(originalRequest);
        } catch {
          // Refresh failed, logout
          useAuthStore.getState().logout();
          globalThis.location.href = '/login';
          throw error;
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      refreshPromise = api.post('/auth/refresh');

      try {
        await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;
        // Retry original request with new cookie
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshPromise = null;
        useAuthStore.getState().logout();
        globalThis.location.href = '/login';
        throw refreshError;
      }
    }

    // Global error notification handler
    const status = error.response?.status;
    const message =
      error.response?.data?.message || 'Erro ao processar requisição';

    // Skip notification for:
    // - Authentication errors (handled by redirect)
    // - Cold server errors (handled by wakeup dialog)
    // - Silent requests (like keep-alive healthcheck)
    const isSilentRequest =
      error.config?.headers?.['X-Silent-Request'] === 'true';

    if (status !== 401 && !isColdServerError(error) && !isSilentRequest) {
      const errorMessage = Array.isArray(message) ? message[0] : message;
      useUIStore.getState().showNotification(errorMessage, 'error');
    }

    throw error;
  }
);

export default api;
