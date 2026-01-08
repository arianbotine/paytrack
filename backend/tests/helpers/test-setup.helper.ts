import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';

/**
 * Configuração base para testes E2E com isolamento de schema
 */
export interface E2ETestContext {
  app: INestApplication;
  prisma: PrismaService;
  testSchema: string;
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
  // 1. Copiar ENUMs
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

  // 3. Copiar foreign keys (não incluídas em LIKE INCLUDING ALL)
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
 * e configura o Prisma Client para usar apenas o schema de teste.
 *
 * @returns Contexto com app, prisma e testSchema
 */
export async function setupE2ETest(): Promise<E2ETestContext> {
  const testSchema = `test_${randomUUID().replaceAll('-', '_')}`;

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
  await prisma.$executeRawUnsafe(`SET search_path TO "${testSchema}", public`);

  await app.init();

  return { app, prisma, testSchema };
}

/**
 * Limpa ambiente de teste E2E
 *
 * Remove o schema de teste e fecha todas as conexões.
 *
 * @param context - Contexto do teste a ser limpo
 */
export async function teardownE2ETest(context: E2ETestContext): Promise<void> {
  const { app, prisma, testSchema } = context;

  await prisma.$executeRawUnsafe(`DROP SCHEMA "${testSchema}" CASCADE`);
  await prisma.$disconnect();
  await app.close();
}
