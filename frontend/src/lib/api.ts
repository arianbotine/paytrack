import axios from 'axios';
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

// Request interceptor - cookies are sent automatically
api.interceptors.request.use(
  config => config,
  error => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh endpoint will use refreshToken from cookie
        await api.post('/auth/refresh');

        // Retry original request with new cookie
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        globalThis.location.href = '/login';
        throw refreshError;
      }
    }

    // Global error notification handler
    const status = error.response?.status;
    const message =
      error.response?.data?.message || 'Erro ao processar requisição';

    // Skip notification for authentication errors (handled by redirect)
    if (status !== 401) {
      const errorMessage = Array.isArray(message) ? message[0] : message;
      useUIStore.getState().showNotification(errorMessage, 'error');
    }

    throw error;
  }
);

export default api;
