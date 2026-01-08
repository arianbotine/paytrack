import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import NodeCache = require('node-cache');

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly cache: NodeCache;
  private readonly logger = new Logger(CacheService.name);
  private readonly statsInterval: NodeJS.Timeout;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutos padrão
      checkperiod: 60, // Verifica expiração a cada 60s
      useClones: false, // Performance: não clona objetos
    });

    // Log de estatísticas a cada 5 minutos
    this.statsInterval = setInterval(
      () => {
        const stats = this.cache.getStats();
        this.logger.log(
          `📊 Cache Stats - Hits: ${stats.hits}, Misses: ${stats.misses}, Keys: ${stats.keys}, Hit Rate: ${this.getHitRate()}%`
        );
      },
      5 * 60 * 1000
    );
  }

  onModuleDestroy() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }

  /**
   * Obtém valor do cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);

    if (value === undefined) {
      this.logger.debug(`❌ Cache MISS: ${key}`);
    } else {
      this.logger.debug(`✅ Cache HIT: ${key}`);
    }

    return value;
  }

  /**
   * Define valor no cache com TTL opcional
   * @param key Chave do cache
   * @param value Valor a ser armazenado
   * @param ttl TTL em segundos (opcional, usa padrão se não fornecido)
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const success = this.cache.set(key, value, ttl || 0);

    if (success) {
      this.logger.debug(`💾 Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
    } else {
      this.logger.warn(`⚠️  Cache SET failed: ${key}`);
    }

    return success;
  }

  /**
   * Remove valor do cache
   */
  del(key: string): number {
    const deleted = this.cache.del(key);

    if (deleted > 0) {
      this.logger.debug(`🗑️  Cache DELETE: ${key}`);
    }

    return deleted;
  }

  /**
   * Remove valores do cache por padrão de chave
   * @param pattern Padrão de chave (ex: 'dashboard:*')
   */
  delByPattern(pattern: string): number {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete = keys.filter(key => regex.test(key));

    if (keysToDelete.length > 0) {
      const deleted = this.cache.del(keysToDelete);
      this.logger.debug(
        `🗑️  Cache DELETE by pattern '${pattern}': ${deleted} keys`
      );
      return deleted;
    }

    return 0;
  }

  /**
   * Limpa o cache
   */
  flush(): void {
    this.cache.flushAll();
    this.logger.log('🧹 Cache flushed');
  }

  /**
   * Limpa cache por prefixo/namespace
   * @param prefix Prefixo das chaves a serem removidas
   */
  flushByPrefix(prefix: string): number {
    const keys = this.cache.keys();
    const keysToDelete = keys.filter(key => key.startsWith(prefix));

    if (keysToDelete.length > 0) {
      const deleted = this.cache.del(keysToDelete);
      this.logger.log(
        `🧹 Cache flushed by prefix '${prefix}': ${deleted} keys`
      );
      return deleted;
    }

    return 0;
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Calcula taxa de acerto do cache
   */
  private getHitRate(): string {
    const stats = this.cache.getStats();
    const total = stats.hits + stats.misses;

    if (total === 0) return '0.00';

    return ((stats.hits / total) * 100).toFixed(2);
  }

  /**
   * Invalida chaves de cache por padrão (alias para delByPattern)
   * @param pattern Padrão de chave (ex: 'payables:list:*')
   */
  async invalidate(pattern: string): Promise<number> {
    return this.delByPattern(pattern);
  }

  /**
   * Wrapper para operações com cache: busca ou executa função
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await fn();
    this.set(key, value, ttl);

    return value;
  }
}
