import { useEffect, useRef } from 'react';
import { useAuthStore, isAuthenticated } from '../stores/authStore';
import api from '../api';

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // 5 minutos em milliseconds

/**
 * Hook que mantém o servidor ativo fazendo requisições periódicas ao healthcheck.
 * Previne que o servidor seja desligado após período de inatividade.
 *
 * O keep-alive:
 * - Inicia automaticamente após o login
 * - Faz requisições a cada 5 minutos
 * - Para quando o usuário faz logout
 * - Funciona em background sem interferir na UX
 */
export function useServerKeepAlive() {
  const authenticated = useAuthStore(isAuthenticated);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const pingServer = async () => {
      try {
        // Requisição silenciosa ao healthcheck
        await api.get('/health', {
          // Não mostrar erros dessa requisição para o usuário
          headers: { 'X-Silent-Request': 'true' },
        });

        console.debug('[Keep-Alive] Ping enviado ao servidor');
      } catch {
        // Falha silenciosa - não impacta a UX
        // O ServerWakeupDialog já cuida de servidores frios em outras requisições
        console.debug('[Keep-Alive] Ping falhou (esperado se servidor frio)');
      }
    };

    if (authenticated) {
      // Fazer ping imediatamente após login
      pingServer();

      // Configurar intervalo de 5 em 5 minutos
      intervalRef.current = globalThis.setInterval(
        pingServer,
        KEEP_ALIVE_INTERVAL
      );

      console.debug('[Keep-Alive] Iniciado - ping a cada 5 minutos');
    } else if (intervalRef.current !== null) {
      // Limpar intervalo quando usuário não está autenticado
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.debug('[Keep-Alive] Parado');
    }

    // Cleanup ao desmontar componente
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [authenticated]);
}
