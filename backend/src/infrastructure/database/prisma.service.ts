import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Configurar connection pool para ambientes com recursos limitados
    const connectionLimit = Number.parseInt(
      process.env.DATABASE_CONNECTION_LIMIT || '5',
      10
    );
    const poolTimeout = Number.parseInt(
      process.env.DATABASE_POOL_TIMEOUT || '60',
      10
    );

    // Adicionar parâmetros de connection pool e keepalive na URL
    const databaseUrl = process.env.DATABASE_URL;
    const keepaliveParams =
      '&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5';
    const poolParams = `&connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
    const urlWithParams = databaseUrl?.includes('?')
      ? `${databaseUrl}${keepaliveParams}${poolParams}`
      : `${databaseUrl}?${keepaliveParams.slice(1)}${poolParams}`;

    super({
      datasources: {
        db: {
          url: urlWithParams,
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });

    this.logger.log(
      `🔌 Connection pool configurado: limit=${connectionLimit}, timeout=${poolTimeout}s, keepalive=enabled`
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }

    const models = Reflect.ownKeys(this).filter(
      key =>
        typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$')
    );

    return Promise.all(
      models.map(modelKey => {
        const model = (this as any)[modelKey];
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
        return Promise.resolve();
      })
    );
  }
}
