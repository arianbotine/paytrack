import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

interface CachedResponse {
  status: number;
  body: unknown;
  expiresAt: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly store = new Map<string, CachedResponse>();
  private readonly ttlMs: number;

  constructor(private readonly reflector: Reflector) {
    // TTL padrão: 1 hora (3600 segundos)
    this.ttlMs =
      Number.parseInt(process.env.IDEMPOTENCY_TTL || '3600', 10) * 1000;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Verificar se o endpoint está marcado como @Idempotent()
    const isIdempotent = this.reflector.get<boolean>(
      IDEMPOTENT_KEY,
      context.getHandler()
    );

    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;

    // Idempotency só se aplica a POST, PUT, PATCH
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      throw new BadRequestException(
        'Header "idempotency-key" é obrigatório para esta operação'
      );
    }

    // Extrair organizationId do user autenticado
    const user = (request as any).user;
    const organizationId = user?.organizationId;

    if (!organizationId) {
      // Se não tiver organizationId, não aplicar idempotency
      return next.handle();
    }

    // Cache key: idempotency:{organizationId}:{key}:{method}:{path}
    const cacheKey = `idempotency:${organizationId}:${idempotencyKey}:${method}:${request.path}`;

    // Limpar entradas expiradas ocasionalmente
    this.evictExpired();

    const cached = this.store.get(cacheKey);
    if (cached) {
      this.logger.warn(
        `🔁 Request duplicado bloqueado: ${method} ${request.path} (key: ${idempotencyKey})`
      );
      response.status(cached.status);
      return of(cached.body);
    }

    // Processar request e armazenar resultado
    return next.handle().pipe(
      tap(responseBody => {
        this.store.set(cacheKey, {
          status: response.statusCode,
          body: responseBody,
          expiresAt: Date.now() + this.ttlMs,
        });

        this.logger.debug(
          `💾 Idempotency key registrada: ${idempotencyKey} (TTL: ${this.ttlMs / 1000}s)`
        );
      })
    );
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
