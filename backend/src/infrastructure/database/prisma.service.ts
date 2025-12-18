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
      process.env.DATABASE_CONNECTION_LIMIT || '10',
      10
    );
    const poolTimeout = Number.parseInt(
      process.env.DATABASE_POOL_TIMEOUT || '20',
      10
    );

    // Adicionar parâmetros de connection pool na URL
    const databaseUrl = process.env.DATABASE_URL;
    const urlWithPool = databaseUrl?.includes('?')
      ? `${databaseUrl}&connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`
      : `${databaseUrl}?connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;

    super({
      datasources: {
        db: {
          url: urlWithPool,
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });

    this.logger.log(
      `🔌 Connection pool configurado: limit=${connectionLimit}, timeout=${poolTimeout}s`
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
