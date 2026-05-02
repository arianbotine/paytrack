import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';

/**
 * Configuração base para testes E2E com isolamento de schema
 */
export interface E2ETestContext {
  app: INestApplication;
  prisma: PrismaService;
  testSchema: string;
  originalDatabaseUrl?: string;
  originalDirectDatabaseUrl?: string;
}

function withSchemaInDatabaseUrl(databaseUrl: string, schema: string): string {
  const parsedUrl = new URL(databaseUrl);
  parsedUrl.searchParams.set('schema', schema);
  return parsedUrl.toString();
}

/**
 * Copia estrutura do schema public para o schema de teste usando comandos nativos do PostgreSQL
 * @param prisma - Instância do Prisma Client
 * @param testSchema - Nome do schema de teste a ser criado
 */
async function copySchemaStructure(
  prisma: PrismaService,
  testSchema: string
): Promise<void> {
  // 1. Copiar ENUMs para o schema de teste
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as labels
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
      LOOP
        EXECUTE format('CREATE TYPE "${testSchema}".%I AS ENUM (%s)',
          r.typname,
          (SELECT string_agg(quote_literal(label), ',') FROM unnest(r.labels) label)
        );
      END LOOP;
    END $$;
  `);

  // 2. Copiar tabelas com estrutura completa (colunas, defaults, constraints, índices)
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;

  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "${testSchema}"."${tablename}" (LIKE public."${tablename}" INCLUDING ALL);`
    );
  }

  // 3. Ajustar colunas enum para usar o enum do schema de teste
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT table_name, column_name, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'USER-DEFINED'
      LOOP
        EXECUTE format(
          'ALTER TABLE "${testSchema}".%I ALTER COLUMN %I DROP DEFAULT',
          r.table_name,
          r.column_name
        );

        EXECUTE format(
          'ALTER TABLE "${testSchema}".%I ALTER COLUMN %I TYPE "${testSchema}".%I USING (%I::text::"${testSchema}".%I)',
          r.table_name,
          r.column_name,
          r.udt_name,
          r.column_name,
          r.udt_name
        );
      END LOOP;
    END $$;
  `);

  // 4. Copiar foreign keys (não incluídas em LIKE INCLUDING ALL)
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT
          tc.constraint_name, tc.table_name, kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule, rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      LOOP
        EXECUTE format(
          'ALTER TABLE "${testSchema}".%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "${testSchema}".%I (%I) ON UPDATE %s ON DELETE %s',
          r.table_name, r.constraint_name, r.column_name,
          r.foreign_table_name, r.foreign_column_name,
          r.update_rule, r.delete_rule
        );
      END LOOP;
    END $$;
  `);
}

/**
 * Inicializa ambiente de teste E2E com schema isolado
 *
 * Cria um schema único para cada teste, copia a estrutura do schema public
 * e configura o Prisma Client para usar apenas o schema de teste via DATABASE_URL.
 *
 * @returns Contexto com app, prisma e testSchema
 */
export async function setupE2ETest(): Promise<E2ETestContext> {
  const testSchema = `e2e_${randomUUID().replaceAll('-', '_')}`;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDirectDatabaseUrl = process.env.DIRECT_DATABASE_URL;

  if (!originalDatabaseUrl) {
    throw new Error('DATABASE_URL não está definido para testes E2E');
  }

  const baseDatabaseUrl = process.env.E2E_DATABASE_URL || originalDatabaseUrl;
  process.env.DATABASE_URL = withSchemaInDatabaseUrl(
    baseDatabaseUrl,
    testSchema
  );

  if (originalDirectDatabaseUrl) {
    const baseDirectDatabaseUrl =
      process.env.E2E_DIRECT_DATABASE_URL || originalDirectDatabaseUrl;
    process.env.DIRECT_DATABASE_URL = withSchemaInDatabaseUrl(
      baseDirectDatabaseUrl,
      testSchema
    );
  }

  const { AppModule } = await import('../../src/app.module');

  // Criar módulo de teste com todas as dependências
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  // Configurar app igual ao main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );
  app.setGlobalPrefix('api');

  // Criar schema isolado e copiar estrutura do public
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${testSchema}"`);
  await copySchemaStructure(prisma, testSchema);

  // Inicializa o app — todas as conexões abertas aqui já usam testSchema
  await app.init();

  return {
    app,
    prisma,
    testSchema,
    originalDatabaseUrl,
    originalDirectDatabaseUrl,
  };
}

/**
 * Limpa ambiente de teste E2E
 *
 * Remove o schema de teste, restaura variáveis de ambiente e fecha conexões.
 *
 * @param context - Contexto do teste a ser limpo
 */
export async function teardownE2ETest(
  context: Partial<E2ETestContext>
): Promise<void> {
  const {
    app,
    prisma,
    testSchema,
    originalDatabaseUrl,
    originalDirectDatabaseUrl,
  } = context;

  try {
    if (prisma && testSchema) {
      await prisma.$executeRawUnsafe(`DROP SCHEMA "${testSchema}" CASCADE`);
    }
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }

    if (app) {
      await app.close();
    }

    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalDirectDatabaseUrl) {
      process.env.DIRECT_DATABASE_URL = originalDirectDatabaseUrl;
    }
  }
}
