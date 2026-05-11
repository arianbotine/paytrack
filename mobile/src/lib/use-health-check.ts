import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const BFF_URL = process.env.EXPO_PUBLIC_BFF_URL || 'http://localhost:3001';
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const BFF_HEALTH_URL = `${BFF_URL}/bff/health`;
const BACKEND_HEALTH_URL = `${BACKEND_URL}/api/health`;

const POLL_INTERVAL_MS = 5_000;
const OVERALL_TIMEOUT_MS = 180_000; // 3 minutos
const REQUEST_TIMEOUT_MS = 5_000;

export type HealthStatus = 'checking' | 'healthy' | 'timeout';

export interface ServiceHealth {
  status: 'ok' | 'unavailable';
}

export interface ServicesHealth {
  bff: ServiceHealth;
  backend: ServiceHealth;
}

export interface HealthCheckState {
  status: HealthStatus;
  elapsedSeconds: number;
  services: ServicesHealth | null;
  retry: () => void;
}

async function pingService(url: string): Promise<'ok' | 'unavailable'> {
  try {
    await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

export function useHealthCheck(): HealthCheckState {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [services, setServices] = useState<ServicesHealth | null>(null);

  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startChecking = useCallback(() => {
    cancelledRef.current = false;
    startTimeRef.current = Date.now();

    setStatus('checking');
    setElapsedSeconds(0);
    setServices(null);

    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds(
        Math.floor((Date.now() - startTimeRef.current) / 1000),
      );
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      if (!cancelledRef.current) {
        clearTimers();
        setStatus('timeout');
      }
    }, OVERALL_TIMEOUT_MS);

    const check = async () => {
      if (cancelledRef.current) return;

      const [bffStatus, backendStatus] = await Promise.all([
        pingService(BFF_HEALTH_URL),
        pingService(BACKEND_HEALTH_URL),
      ]);

      if (cancelledRef.current) return;

      const current: ServicesHealth = {
        bff: { status: bffStatus },
        backend: { status: backendStatus },
      };

      setServices(current);

      if (bffStatus === 'ok' && backendStatus === 'ok') {
        clearTimers();
        setStatus('healthy');
      }
    };

    check();
    pollIntervalRef.current = setInterval(check, POLL_INTERVAL_MS);
  }, [clearTimers]);

  const retry = useCallback(() => {
    clearTimers();
    startChecking();
  }, [clearTimers, startChecking]);

  useEffect(() => {
    startChecking();
    return () => {
      cancelledRef.current = true;
      clearTimers();
    };
  }, [startChecking, clearTimers]);

  return { status, elapsedSeconds, services, retry };
}
