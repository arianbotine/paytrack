import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

/**
 * Interceptor de Autenticação
 * Adiciona Authorization header com Bearer token em todas as requisições
 */
export function setupAuthInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );
}

/**
 * Interceptor de Refresh Token
 * Gerencia renovação automática de tokens quando recebe 401
 */
export function setupRefreshInterceptor(instance: AxiosInstance) {
  let isRefreshing = false;
  let refreshPromise: Promise<any> | null = null;

  instance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // Skip refresh para requisições de auth
      if (error.response?.status === 401 && !originalRequest._retry) {
        const requestUrl = originalRequest.url || '';
        const isAuthRequest =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/refresh');

        if (isAuthRequest) {
          throw error;
        }

        // Check access token
        const hasAccessToken = !!useAuthStore.getState().accessToken;

        if (!hasAccessToken) {
          useAuthStore.getState().logout();
          globalThis.location.href = '/login';
          throw error;
        }

        // Se refresh já está em andamento, aguarda
        if (isRefreshing) {
          try {
            await refreshPromise;
            const newToken = useAuthStore.getState().accessToken;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } catch {
            useAuthStore.getState().logout();
            globalThis.location.href = '/login';
            throw error;
          }
        }

        // Inicia refresh
        originalRequest._retry = true;
        isRefreshing = true;
        refreshPromise = instance.post('/auth/refresh');

        try {
          const response = await refreshPromise;
          const { accessToken } = response.data;

          useAuthStore.getState().setAccessToken(accessToken);

          isRefreshing = false;
          refreshPromise = null;

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          refreshPromise = null;
          useAuthStore.getState().logout();
          globalThis.location.href = '/login';
          throw refreshError;
        }
      }

      throw error;
    }
  );
}

/**
 * Interceptor de Server Wakeup
 * Gerencia retry automático quando servidor está em cold start (Render free tier)
 */
export function setupServerWakeupInterceptor(instance: AxiosInstance) {
  const MAX_WAKEUP_RETRIES = 15;
  const WAKEUP_RETRY_DELAY = 5000;
  let wakeupRetryCount = 0;
  let wakeupRetryTimeout: number | null = null;

  const isColdServerError = (error: any): boolean => {
    if (!error.response && error.code === 'ERR_NETWORK') {
      return true;
    }
    const status = error.response?.status;
    return status === 502 || status === 503 || status === 504;
  };

  const retryWithWakeup = async (originalRequest: any): Promise<any> => {
    const { useUIStore } = await import('../stores/uiStore');

    if (wakeupRetryCount === 0) {
      useUIStore.getState().setServerWaking(true);
    }

    wakeupRetryCount++;
    useUIStore.getState().incrementRetryAttempt();

    if (wakeupRetryCount >= MAX_WAKEUP_RETRIES) {
      wakeupRetryCount = 0;
      useUIStore.getState().setServerWaking(false);
      useUIStore
        .getState()
        .showNotification(
          'O servidor está demorando mais que o esperado. Por favor, tente novamente em alguns instantes.',
          'error'
        );
      throw new Error('Server wakeup timeout');
    }

    await new Promise(resolve => {
      wakeupRetryTimeout = setTimeout(resolve, WAKEUP_RETRY_DELAY);
    });

    try {
      const response = await instance(originalRequest);
      wakeupRetryCount = 0;
      useUIStore.getState().setServerWaking(false);
      useUIStore.getState().resetRetryAttempt();
      if (wakeupRetryTimeout) {
        clearTimeout(wakeupRetryTimeout);
        wakeupRetryTimeout = null;
      }
      return response;
    } catch (retryError: any) {
      if (isColdServerError(retryError)) {
        return retryWithWakeup(originalRequest);
      }
      wakeupRetryCount = 0;
      useUIStore.getState().setServerWaking(false);
      useUIStore.getState().resetRetryAttempt();
      throw retryError;
    }
  };

  instance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      if (isColdServerError(error) && !originalRequest._wakeupRetry) {
        originalRequest._wakeupRetry = true;
        return retryWithWakeup(originalRequest);
      }

      throw error;
    }
  );
}
