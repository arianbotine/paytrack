import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { createAuthenticatedUser } from './auth.helper';

/**
 * Helper para reutilizar autenticação entre testes
 * Evita rate limiting ao criar usuário apenas uma vez por suite
 */

type SharedAuth = {
  organizationId: string;
  accessToken: string;
  userId: string;
  email: string;
};

const authCache = new Map<string, Promise<SharedAuth>>();

/**
 * Obtém ou cria autenticação compartilhada para uma suite de testes
 * @param key - Identificador único para a suite (ex: 'payables-get')
 * @param app - NestJS application
 * @param prisma - Prisma service
 */
export async function getSharedAuth(
  key: string,
  app: INestApplication,
  prisma: PrismaService
): Promise<SharedAuth> {
  if (!authCache.has(key)) {
    authCache.set(key, createAuthenticatedUser(app, prisma));
  }

  return authCache.get(key)!;
}

/**
 * Limpa cache de autenticação (usar em afterAll global se necessário)
 */
export function clearAuthCache(): void {
  authCache.clear();
}
