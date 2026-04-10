import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { z } from 'zod';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  api,
  useAuthStore,
  AuthResponse,
  saveCredentials,
  clearCredentials,
} from '../../lib';

// ---------------------------------------------------------------------------
// Schema & types
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type LoginForm = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLOW_REQUEST_THRESHOLD_MS = 10_000;
const RETRY_DELAY_MS = 3_000;

// Statuses do BFF que indicam que o backend ainda está acordando (cold start em cascata)
const RETRIABLE_BFF_STATUSES = new Set([502, 503, 504]);

function isRetriableError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;

  // 502 Bad Gateway / 503 Service Unavailable / 504 Gateway Timeout:
  // o BFF acordou mas o backend ainda não — retenta até o backend estar pronto
  if (error.response && RETRIABLE_BFF_STATUSES.has(error.response.status)) {
    return true;
  }

  // Sem resposta: erro de rede/timeout direto com o BFF
  if (error.response) return false;
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    error.message.toLowerCase().includes('timeout')
  );
}

export function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Email ou senha inválidos.';
    }
    if (error.response) {
      return 'Ocorreu um erro no servidor. Tente novamente.';
    }
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseLoginState {
  loginMutation: ReturnType<
    typeof useMutation<AuthResponse, Error, LoginForm & { rememberMe: boolean }>
  >;
  isSlowRequest: boolean;
  retryCount: number;
}

export function useLogin(): UseLoginState {
  const [isSlowRequest, setIsSlowRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortedRef = useRef(false);
  const setAuth = useAuthStore(state => state.setAuth);

  function clearSlowState() {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setIsSlowRequest(false);
    setRetryCount(0);
  }

  const loginMutation = useMutation<
    AuthResponse,
    Error,
    LoginForm & { rememberMe: boolean }
  >({
    mutationFn: async data => {
      abortedRef.current = false;
      setRetryCount(0);

      slowTimerRef.current = setTimeout(
        () => setIsSlowRequest(true),
        SLOW_REQUEST_THRESHOLD_MS
      );

      let attempt = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const response = await api.post<AuthResponse>('/auth/login', {
            email: data.email,
            password: data.password,
          });
          return response.data;
        } catch (error) {
          if (abortedRef.current) throw error;

          if (!isRetriableError(error)) {
            throw error;
          }

          attempt += 1;
          setRetryCount(attempt);
          setIsSlowRequest(true);

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

          if (abortedRef.current) throw error;
        }
      }
    },

    onSuccess: async (data, variables) => {
      clearSlowState();

      if (variables.rememberMe) {
        await saveCredentials({
          email: variables.email,
          password: variables.password,
        });
      } else {
        await clearCredentials();
      }

      await setAuth(data.user, data.accessToken, data.refreshToken);
      if (
        !data.user.currentOrganization &&
        data.user.availableOrganizations.length > 1
      ) {
        router.replace('/(auth)/select-organization');
      } else {
        router.replace('/(tabs)');
      }
    },

    onError: () => {
      clearSlowState();
    },
  });

  return { loginMutation, isSlowRequest, retryCount };
}
