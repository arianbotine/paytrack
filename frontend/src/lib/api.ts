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

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

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
      if (isRefreshing) {
        // If refresh is already in progress, wait for it
        try {
          await refreshPromise;
          // Retry original request with new cookie
          return api(originalRequest);
        } catch (refreshError) {
          throw refreshError;
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

    // Skip notification for authentication errors (handled by redirect)
    if (status !== 401) {
      const errorMessage = Array.isArray(message) ? message[0] : message;
      useUIStore.getState().showNotification(errorMessage, 'error');
    }

    throw error;
  }
);

export default api;
