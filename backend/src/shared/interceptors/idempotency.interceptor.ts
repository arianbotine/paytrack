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
import { CacheService } from '../services/cache.service';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly ttl: number;

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector
  ) {
    // TTL padrão: 1 hora (3600 segundos)
    this.ttl = Number.parseInt(process.env.IDEMPOTENCY_TTL || '3600', 10);
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

    // Verificar se já existe resposta cacheada
    const cachedResponse = this.cacheService.get<{
      status: number;
      body: any;
    }>(cacheKey);

    if (cachedResponse) {
      this.logger.warn(
        `🔁 Request duplicado bloqueado: ${method} ${request.path} (key: ${idempotencyKey})`
      );

      // Retornar resposta cacheada
      response.status(cachedResponse.status);
      return of(cachedResponse.body);
    }

    // Processar request e cachear resultado
    return next.handle().pipe(
      tap(responseBody => {
        this.cacheService.set(
          cacheKey,
          {
            status: response.statusCode,
            body: responseBody,
          },
          this.ttl
        );

        this.logger.debug(
          `💾 Resposta cacheada para idempotency-key: ${idempotencyKey} (TTL: ${this.ttl}s)`
        );
      })
    );
  }
}
