import { v4 as uuidv4 } from 'uuid';

/**
 * Gera e define uma chave de idempotência para a próxima requisição.
 * A chave é automaticamente incluída no header 'idempotency-key' pelo interceptor do axios.
 *
 * @returns A chave de idempotência gerada
 *
 * @example
 * // Antes de fazer uma mutation crítica
 * const key = setIdempotencyKey();
 * await api.post('/payables', data);
 */
export function setIdempotencyKey(): string {
  const key = uuidv4();
  (globalThis as any).__IDEMPOTENCY_KEY__ = key;
  return key;
}

/**
 * Limpa a chave de idempotência após uso
 */
export function clearIdempotencyKey(): void {
  delete (globalThis as any).__IDEMPOTENCY_KEY__;
}

/**
 * Wrapper para executar uma função com idempotency
 */
export async function withIdempotency<T>(fn: () => Promise<T>): Promise<T> {
  setIdempotencyKey();
  try {
    return await fn();
  } finally {
    clearIdempotencyKey();
  }
}
