import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../lib/stores/authStore';
import { BatchState } from '../types';

const STORAGE_KEY_PREFIX = 'paytrack:batch-import';
const DEBOUNCE_MS = 500;

/**
 * Hook personalizado para persistir e restaurar o estado do cadastro em lote no localStorage.
 * Salva automaticamente com debounce para evitar excesso de escritas.
 *
 * @param state - Estado atual do batch import
 * @param setState - Função para atualizar o estado
 * @returns Função para limpar o storage manualmente
 */
export function useBatchStorage(
  state: BatchState,
  setState: React.Dispatch<React.SetStateAction<BatchState>>
) {
  const user = useAuthStore(state => state.user);
  const organizationId = user?.currentOrganization?.id;

  // Chave única por organização para isolar dados
  const storageKey = organizationId
    ? `${STORAGE_KEY_PREFIX}:${organizationId}`
    : null;

  // Restaurar estado inicial do localStorage ao montar componente
  useEffect(() => {
    if (!storageKey) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as BatchState;
        setState(parsed);
      }
    } catch (error) {
      console.error('Erro ao restaurar estado do localStorage:', error);
      // Em caso de erro, limpar storage corrompido
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, setState]);

  // Salvar estado no localStorage com debounce
  useEffect(() => {
    if (!storageKey) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error('Erro ao salvar estado no localStorage:', error);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [state, storageKey]);

  // Função para limpar storage manualmente (ex: após processar todas as contas)
  const clearStorage = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return { clearStorage };
}
