/**
 * Utilitário para gerenciar localStorage com escopo de organização.
 *
 * IMPORTANTE: Em sistemas multi-tenant, dados no localStorage DEVEM ser
 * isolados por organização para evitar vazamento de dados entre organizações.
 */

const STORAGE_PREFIX = 'paytrack';

/**
 * Gera uma chave de localStorage com escopo de organização
 */
export function getOrganizationStorageKey(
  organizationId: string,
  key: string
): string {
  return `${STORAGE_PREFIX}:${organizationId}:${key}`;
}

/**
 * Salva dados no localStorage com escopo de organização
 */
export function setOrganizationStorage<T>(
  organizationId: string,
  key: string,
  value: T
): void {
  try {
    const storageKey = getOrganizationStorageKey(organizationId, key);
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error(`Erro ao salvar no localStorage [${key}]:`, error);
  }
}

/**
 * Recupera dados do localStorage com escopo de organização
 */
export function getOrganizationStorage<T>(
  organizationId: string,
  key: string
): T | null {
  try {
    const storageKey = getOrganizationStorageKey(organizationId, key);
    const item = localStorage.getItem(storageKey);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Erro ao recuperar do localStorage [${key}]:`, error);
    return null;
  }
}

/**
 * Remove dados do localStorage com escopo de organização
 */
export function removeOrganizationStorage(
  organizationId: string,
  key: string
): void {
  try {
    const storageKey = getOrganizationStorageKey(organizationId, key);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Erro ao remover do localStorage [${key}]:`, error);
  }
}

/**
 * Remove TODOS os dados de localStorage de uma organização específica
 *
 * CRÍTICO: Deve ser chamado ao trocar de organização para evitar
 * vazamento de dados entre organizações
 */
export function clearOrganizationStorage(organizationId: string): void {
  try {
    const prefix = `${STORAGE_PREFIX}:${organizationId}:`;
    const keysToRemove: string[] = [];

    // Iterar sobre todas as chaves do localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remover todas as chaves da organização
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log(
      `[OrganizationStorage] Limpou ${keysToRemove.length} itens da organização ${organizationId}`
    );
  } catch (error) {
    console.error(
      `Erro ao limpar localStorage da organização ${organizationId}:`,
      error
    );
  }
}

/**
 * Migra dados antigos do localStorage para usar organizationId
 *
 * Útil para migrar dados que foram salvos SEM organizationId
 */
export function migrateToOrganizationStorage(
  organizationId: string,
  oldKey: string,
  newKey: string
): void {
  try {
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      setOrganizationStorage(organizationId, newKey, JSON.parse(oldData));
      localStorage.removeItem(oldKey);
      console.log(
        `[OrganizationStorage] Migrou dados de '${oldKey}' para '${newKey}'`
      );
    }
  } catch (error) {
    console.error(`Erro ao migrar localStorage [${oldKey}]:`, error);
  }
}
