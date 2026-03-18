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
 *
 * FLUXO:
 * 1. Qualquer requisição que demorar mais de 10s → testa healthcheck
 * 2. Se healthcheck demorar mais de 5s (timeout) → exibe modal "servidor acordando"
 * 3. Erros de rede (ERR_NETWORK, 502, 503, 504) → testa healthcheck + retry automático
 * 4. A modal é sempre baseada no resultado do healthcheck, nunca diretamente no erro da rota
 */
export function setupServerWakeupInterceptor(instance: AxiosInstance) {
  const MAX_WAKEUP_RETRIES = 15;
  const WAKEUP_RETRY_DELAY = 5000;
  /** Timeout do healthcheck: se demorar mais que isso, servidor está lento */
  const HEALTH_CHECK_TIMEOUT = 5000;
  /** Limiar para considerar uma requisição lenta e acionar o healthcheck */
  const SLOW_REQUEST_THRESHOLD = 10000;

  let wakeupRetryCount = 0;
  /** Promise em andamento para evitar health checks simultâneos */
  let healthCheckPromise: Promise<boolean> | null = null;
  /** Flag para evitar polling simultâneo do /health */
  let pollingHealth = false;

  const isColdServerError = (error: any): boolean => {
    if (!error.response && error.code === 'ERR_NETWORK') return true;
    const status = error.response?.status;
    return status === 502 || status === 503 || status === 504;
  };

  /**
   * Exibe a modal de "servidor acordando" e faz polling no /health
   * a cada WAKEUP_RETRY_DELAY ms até que o servidor responda com sucesso.
   * Chamadas concorrentes são ignoradas enquanto polling já estiver ativo.
   */
  const pollHealthUntilReady = (): void => {
    if (pollingHealth) return;
    pollingHealth = true;
    useUIStore.getState().setServerWaking(true);

    const poll = async () => {
      useUIStore.getState().incrementRetryAttempt();
      await new Promise(resolve => setTimeout(resolve, WAKEUP_RETRY_DELAY));
      const healthy = await checkServerHealth();
      if (healthy) {
        pollingHealth = false;
        useUIStore.getState().setServerWaking(false);
        useUIStore.getState().resetRetryAttempt();
      } else {
        poll();
      }
    };

    poll();
  };

  /**
   * Sonda o /health com timeout de 5s.
   * Retorna true  → servidor saudável e rápido.
   * Retorna false → servidor lento (timeout) ou fora do ar.
   * Chamadas concorrentes reutilizam a mesma promise.
   *
   * Se o health ultrapassar o timeout (5s), ativa pollHealthUntilReady
   * para exibir a modal e continuar sondando até o servidor recuperar.
   */
  const checkServerHealth = (): Promise<boolean> => {
    if (healthCheckPromise) return healthCheckPromise;

    healthCheckPromise = instance
      .get('/health', {
        timeout: HEALTH_CHECK_TIMEOUT,
        headers: { 'X-Health-Check': 'true' },
      })
      .then(() => true)
      .catch(error => {
        // Timeout do /health indica servidor lento → exibe modal e inicia polling
        if (error.code === 'ECONNABORTED') {
          pollHealthUntilReady();
        }
        return false;
      })
      .finally(() => {
        healthCheckPromise = null;
      });

    return healthCheckPromise;
  };

  const retryWithWakeup = async (originalRequest: any): Promise<any> => {
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

    await new Promise(resolve => setTimeout(resolve, WAKEUP_RETRY_DELAY));

    try {
      const response = await instance(originalRequest);
      wakeupRetryCount = 0;
      useUIStore.getState().setServerWaking(false);
      useUIStore.getState().resetRetryAttempt();
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

  // Request interceptor: registra o timestamp de início de cada requisição
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (!config.headers['X-Health-Check']) {
        (config as any)._requestStartTime = Date.now();
      }
      return config;
    },
    error => Promise.reject(error)
  );

  // Response interceptor: detecta requisições lentas e erros de servidor frio
  instance.interceptors.response.use(
    response => {
      // Requisição bem-sucedida, mas lenta → testa healthcheck em background
      const startTime = (response.config as any)?._requestStartTime;
      if (startTime && Date.now() - startTime > SLOW_REQUEST_THRESHOLD) {
        checkServerHealth().then(healthy => {
          if (!healthy) useUIStore.getState().setServerWaking(true);
        });
      }
      return response;
    },
    async error => {
      const originalRequest = error.config;

      // Ignora requisições de healthcheck para evitar loops
      if (originalRequest?.headers?.['X-Health-Check']) {
        throw error;
      }

      const startTime = originalRequest?._requestStartTime as
        | number
        | undefined;
      const elapsed = startTime ? Date.now() - startTime : 0;
      const isColdError = isColdServerError(error);
      const isSlowRequest = elapsed > SLOW_REQUEST_THRESHOLD;

      // Aciona healthcheck se for erro de servidor frio OU requisição lenta
      if ((isColdError || isSlowRequest) && !originalRequest?._wakeupRetry) {
        const isServerHealthy = await checkServerHealth();

        if (!isServerHealthy) {
          if (isColdError) {
            // Servidor frio → mostra modal e retenta automaticamente
            originalRequest._wakeupRetry = true;
            return retryWithWakeup(originalRequest);
          }
          // Requisição lenta mas sem erro de cold start → apenas exibe modal
          useUIStore.getState().setServerWaking(true);
        }
      }

      throw error;
    }
  );
}
