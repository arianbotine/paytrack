import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');

/**
 * Contexto de autenticação criado para testes
 */
export interface AuthContext {
  organizationId: string;
  userId: string;
  email: string;
  password: string;
  accessToken: string;
}

/**
 * Opções para criação de usuário de teste
 */
export interface CreateTestUserOptions {
  email?: string;
  password?: string;
  name?: string;
  role?: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  isSystemAdmin?: boolean;
  organizationName?: string;
}

/**
 * Cria uma organização, usuário e obtém token de acesso
 * @param app Aplicação NestJS
 * @param prisma Instância do PrismaService
 * @param options Opções de configuração do usuário
 * @returns Contexto de autenticação com tokens e IDs
 */
export async function createAuthenticatedUser(
  app: INestApplication,
  prisma: PrismaService,
  options: CreateTestUserOptions = {}
): Promise<AuthContext> {
  const organizationId = randomUUID();
  const userId = randomUUID();
  const email = options.email || `test_${randomUUID()}@example.com`;
  const password = options.password || 'testpassword123';
  const name = options.name || 'Test User';
  const role = options.role || 'OWNER';
  const isSystemAdmin = options.isSystemAdmin || false;
  const organizationName = options.organizationName || 'Test Organization';

  const hashedPassword = await bcrypt.hash(password, 10);

  // Criar organização
  await prisma.organization.create({
    data: {
      id: organizationId,
      name: organizationName,
      isActive: true,
    },
  });

  // Criar usuário
  await prisma.user.create({
    data: {
      id: userId,
      email,
      name,
      password: hashedPassword,
      isActive: true,
      isSystemAdmin,
      organizations: {
        create: {
          organizationId,
          role,
          isActive: true,
        },
      },
    },
  });

  // Obter token via login
  const loginResponse = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    organizationId,
    userId,
    email,
    password,
    accessToken: loginResponse.body.accessToken,
  };
}

/**
 * Cria múltiplos usuários de teste
 * @param app Aplicação NestJS
 * @param prisma Instância do PrismaService
 * @param count Número de usuários a criar
 * @param options Opções base para todos os usuários
 * @returns Array com contextos de autenticação
 */
export async function createMultipleUsers(
  app: INestApplication,
  prisma: PrismaService,
  count: number,
  options: CreateTestUserOptions = {}
): Promise<AuthContext[]> {
  const users: AuthContext[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createAuthenticatedUser(app, prisma, {
      ...options,
      email: options.email || `test_${i}_${randomUUID()}@example.com`,
    });
    users.push(user);
  }

  return users;
}
