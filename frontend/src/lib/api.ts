import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  setupAuthInterceptor,
  setupRefreshInterceptor,
  setupServerWakeupInterceptor,
} from './api/interceptors';
import { useUIStore } from './stores/uiStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup interceptors na ordem correta
setupAuthInterceptor(api);
setupRefreshInterceptor(api);
setupServerWakeupInterceptor(api);

// Request interceptor - Idempotency key para mutações
api.interceptors.request.use(
  config => {
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
      let idempotencyKey = (globalThis as any).__IDEMPOTENCY_KEY__;

      if (!idempotencyKey) {
        idempotencyKey = uuidv4();
      }

      config.headers['idempotency-key'] = idempotencyKey;

      if (!(globalThis as any).__IDEMPOTENCY_KEY_MANUAL__) {
        delete (globalThis as any).__IDEMPOTENCY_KEY__;
      }
    }

    return config;
  },
  error => Promise.reject(error)
);

// Global error notification handler
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message || 'Erro ao processar requisição';

    const isSilentRequest =
      error.config?.headers?.['X-Silent-Request'] === 'true';

    // Skip notification para auth errors, server errors, e silent requests
    const isColdServer =
      (!error.response && error.code === 'ERR_NETWORK') ||
      [502, 503, 504].includes(status);

    if (status !== 401 && !isColdServer && !isSilentRequest) {
      const errorMessage = Array.isArray(message) ? message[0] : message;
      useUIStore.getState().showNotification(errorMessage, 'error');
    }

    throw error;
  }
);

export default api;
