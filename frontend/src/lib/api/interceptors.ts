import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

/**
 * SISTEMA DE DETECÇÃO DE SERVIDOR FRIO
 *
 * Este arquivo implementa interceptores Axios para lidar com servidores em cold start
 * (comum em tier gratuito do Render). A estratégia usa healthcheck como "termômetro":
 *
 * 1. Quando uma requisição falha com erro de rede (502, 503, 504, ERR_NETWORK)
 * 2. Primeiro verifica /health (endpoint rápido sem processamento)
 * 3. Se healthcheck falhar → Servidor REALMENTE frio → Mostra modal + retry automático
 * 4. Se healthcheck passar → Servidor OK, erro específico da rota → Deixa falhar normalmente
 *
 * BENEFÍCIOS:
 * - ✅ Evita modal em requisições lentas (filtros, relatórios) quando servidor está OK
 * - ✅ Mostra modal apenas quando servidor está realmente acordando do cold start
 * - ✅ Usuário diferencia: "servidor acordando" vs "requisição lenta/erro"
 * - ✅ Não interfere em erros legítimos (validação, permissão, não encontrado)
 */

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

      // Só processa 401 e evita retry múltiplo
      if (error.response?.status !== 401 || originalRequest._retry) {
        throw error;
      }

      const requestUrl = originalRequest.url || '';
      const isAuthRequest =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/refresh');

      // Skip refresh para requisições de auth ou sem token
      if (isAuthRequest || !useAuthStore.getState().accessToken) {
        useAuthStore.getState().logout();
        globalThis.location.href = '/login';
        throw error;
      }

      // Limita tentativas de refresh
      const retryCount = (originalRequest._retryCount || 0) + 1;
      if (retryCount > 2) {
        useAuthStore.getState().logout();
        globalThis.location.href = '/login';
        throw error;
      }

      originalRequest._retry = true;
      originalRequest._retryCount = retryCount;

      // Se refresh já está em andamento, aguarda
      if (isRefreshing && refreshPromise) {
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

      // Inicia novo refresh
      isRefreshing = true;
      refreshPromise = instance.post('/auth/refresh');

      try {
        const response = await refreshPromise;
        const { accessToken } = response.data;

        useAuthStore.getState().setAccessToken(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        globalThis.location.href = '/login';
        throw refreshError;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }
  );
}

/**
 * Interceptor de Server Wakeup
 * Gerencia retry automático quando servidor está em cold start (Render free tier).
 * Usa healthcheck para detectar se servidor está realmente fora do ar vs apenas lento.
 */
export function setupServerWakeupInterceptor(instance: AxiosInstance) {
  const MAX_WAKEUP_RETRIES = 15;
  const WAKEUP_RETRY_DELAY = 5000;
  const HEALTH_CHECK_TIMEOUT = 5000;
  let wakeupRetryCount = 0;
  let isCheckingHealth = false;

  const isColdServerError = (error: any): boolean => {
    if (!error.response && error.code === 'ERR_NETWORK') {
      return true;
    }
    const status = error.response?.status;
    return status === 502 || status === 503 || status === 504;
  };

  /**
   * Verifica se o servidor está realmente fora do ar usando healthcheck.
   * Como healthcheck não processa nada, se falhar é porque servidor está frio.
   */
  const checkServerHealth = async (): Promise<boolean> => {
    // Evita múltiplas verificações simultâneas
    if (isCheckingHealth) {
      return false;
    }

    isCheckingHealth = true;
    try {
      await instance.get('/health', {
        timeout: HEALTH_CHECK_TIMEOUT,
        headers: { 'X-Health-Check': 'true' },
      });
      return true;
    } catch {
      return false;
    } finally {
      isCheckingHealth = false;
    }
  };

  const retryWithWakeup = async (originalRequest: any): Promise<any> => {
    // Mostra modal na primeira tentativa
    if (wakeupRetryCount === 0) {
      useUIStore.getState().setServerWaking(true);
    }

    wakeupRetryCount++;
    useUIStore.getState().incrementRetryAttempt();

    // Limita tentativas
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

    // Aguarda antes de tentar novamente
    await new Promise(resolve => setTimeout(resolve, WAKEUP_RETRY_DELAY));

    try {
      const response = await instance(originalRequest);
      // Sucesso - reseta estado e fecha modal
      wakeupRetryCount = 0;
      useUIStore.getState().setServerWaking(false);
      useUIStore.getState().resetRetryAttempt();
      return response;
    } catch (retryError: any) {
      // Se continua com erro de servidor frio, tenta novamente
      if (isColdServerError(retryError)) {
        return retryWithWakeup(originalRequest);
      }
      // Outro tipo de erro - reseta estado e propaga
      wakeupRetryCount = 0;
      useUIStore.getState().setServerWaking(false);
      useUIStore.getState().resetRetryAttempt();
      throw retryError;
    }
  };

  // Interceptor de response: detecta erros e verifica saúde do servidor
  instance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // Ignora requisições de healthcheck para evitar loops
      if (originalRequest?.headers?.['X-Health-Check']) {
        throw error;
      }

      // Detecta erro de servidor frio e valida com healthcheck
      if (isColdServerError(error) && !originalRequest._wakeupRetry) {
        const isServerHealthy = await checkServerHealth();

        if (!isServerHealthy) {
          // Servidor está realmente frio - inicia wakeup com modal
          originalRequest._wakeupRetry = true;
          return retryWithWakeup(originalRequest);
        }

        // Servidor respondendo - erro específico da rota
        throw error;
      }

      throw error;
    }
  );
}
