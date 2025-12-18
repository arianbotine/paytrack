import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TimeoutMiddleware.name);
  private readonly timeout: number;

  constructor() {
    // Timeout padrão: 30 segundos (configurável via env)
    this.timeout = Number.parseInt(
      process.env.REQUEST_TIMEOUT_MS || '30000',
      10
    );
    this.logger.log(`⏱️  Request timeout configurado: ${this.timeout}ms`);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        this.logger.warn(
          `⏰ TIMEOUT: ${req.method} ${req.url} - Excedeu ${this.timeout}ms`
        );

        res.status(408).json({
          statusCode: 408,
          message: 'Requisição excedeu o tempo limite. Tente novamente.',
          error: 'Request Timeout',
        });
      }
    }, this.timeout);

    // Limpa o timer quando a resposta é enviada
    res.on('finish', () => {
      clearTimeout(timer);
    });

    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  }
}
