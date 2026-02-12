import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { clearOrganizationStorage } from '../../shared/utils/organization-storage';

/**
 * Hook crítico para gerenciar mudanças de organização.
 *
 * SEGURANÇA: Previne vazamento de dados entre organizações limpando
 * todos os caches quando a organização atual muda.
 *
 * Este hook:
 * 1. Detecta mudanças no organizationId
 * 2. Limpa o cache do TanStack Query
 * 3. Limpa localStorage específico da organização anterior
 * 4. Força navegação para o dashboard (evita estados inconsistentes)
 */
export function useOrganizationChangeHandler() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const organizationId = user?.currentOrganization?.id;

  // Ref para armazenar o organizationId anterior
  const previousOrgIdRef = useRef<string | undefined>(organizationId);

  useEffect(() => {
    // Ignorar primeira renderização
    if (!previousOrgIdRef.current) {
      previousOrgIdRef.current = organizationId;
      return;
    }

    // Detectar mudança de organização
    if (organizationId && organizationId !== previousOrgIdRef.current) {
      console.warn(
        `[SECURITY] Troca de organização detectada: ${previousOrgIdRef.current} -> ${organizationId}`
      );

      // 1. Limpar TODOS os caches do TanStack Query
      queryClient.clear();

      // 2. Limpar localStorage da organização ANTERIOR (se existir)
      if (previousOrgIdRef.current) {
        clearOrganizationStorage(previousOrgIdRef.current);
      }

      // 3. Resetar scroll
      window.scrollTo(0, 0);

      // 4. Forçar navegação para dashboard se não estiver em rotas de auth
      const isAuthRoute = location.pathname.startsWith('/auth');
      if (!isAuthRoute && location.pathname !== '/dashboard') {
        console.log(
          '[SECURITY] Redirecionando para dashboard após troca de organização'
        );
        navigate('/dashboard', { replace: true });
      }

      // Atualizar ref
      previousOrgIdRef.current = organizationId;

      console.log('[SECURITY] Caches limpos com sucesso');
    }
  }, [organizationId, queryClient, navigate, location.pathname]);
}
