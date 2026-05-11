/**
 * ServerKeepAliveContext
 *
 * Envia pings ao BFF e ao Backend a cada PING_INTERVAL_MS enquanto o app está
 * em uso, evitando que os servidores gratuitos (Render) durmam por inatividade.
 *
 * Basta envolver a árvore com <ServerKeepAliveProvider> — nenhum estado
 * precisa ser consumido pelos filhos.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import axios from 'axios';

// ─── Configurações ────────────────────────────────────────────────────────────

const BFF_URL = process.env.EXPO_PUBLIC_BFF_URL || 'http://localhost:3001';
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const BFF_PING_URL = `${BFF_URL}/bff/health`;
const BACKEND_PING_URL = `${BACKEND_URL}/api/health`;

const PING_INTERVAL_MS = 60_000; // 1 minuto
const PING_TIMEOUT_MS = 8_000;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type KeepAliveStatus = 'idle' | 'ok' | 'error';

interface ServerKeepAliveState {
  lastPingAt: Date | null;
  status: KeepAliveStatus;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ServerKeepAliveContext = createContext<ServerKeepAliveState>({
  lastPingAt: null,
  status: 'idle',
});

export function useServerKeepAlive(): ServerKeepAliveState {
  return useContext(ServerKeepAliveContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ServerKeepAliveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<KeepAliveStatus>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ping = async () => {
      try {
        // Pinga BFF e Backend em paralelo para manter ambos ativos
        await Promise.all([
          axios.get(BFF_PING_URL, { timeout: PING_TIMEOUT_MS }),
          axios.get(BACKEND_PING_URL, { timeout: PING_TIMEOUT_MS }),
        ]);
        setLastPingAt(new Date());
        setStatus('ok');
      } catch {
        setStatus('error');
      }
    };

    ping();
    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <ServerKeepAliveContext.Provider value={{ lastPingAt, status }}>
      {children}
    </ServerKeepAliveContext.Provider>
  );
}
