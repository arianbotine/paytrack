import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const BFF_URL = process.env.EXPO_PUBLIC_BFF_URL || 'http://localhost:3001';
const HEALTH_URL = `${BFF_URL}/bff/health`;

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 180_000; // 3 minutes
const REQUEST_TIMEOUT_MS = 5_000;

export type HealthStatus = 'checking' | 'healthy' | 'timeout';

export interface ServiceHealth {
  status: string;
  detail?: string;
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

export function useHealthCheck(): HealthCheckState {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [services, setServices] = useState<ServicesHealth | null>(null);

  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
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

    // Track elapsed seconds for progress display
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Hard timeout after 3 minutes
    timeoutRef.current = setTimeout(() => {
      if (!cancelledRef.current) {
        clearTimers();
        setStatus('timeout');
      }
    }, TIMEOUT_MS);

    const check = async () => {
      if (cancelledRef.current) return;

      try {
        const response = await axios.get<{
          status: string;
          services: ServicesHealth;
        }>(HEALTH_URL, { timeout: REQUEST_TIMEOUT_MS });

        if (cancelledRef.current) return;

        setServices(response.data.services ?? null);

        if (response.data.status === 'ok') {
          clearTimers();
          setStatus('healthy');
        }
      } catch {
        if (!cancelledRef.current) {
          setServices(null);
        }
      }
    };

    // Check immediately, then poll
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
