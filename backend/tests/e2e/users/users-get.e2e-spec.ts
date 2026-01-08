import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Users - GET (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma, {
      role: 'OWNER',
    });
    accessToken = auth.accessToken;
    userId = auth.userId;

    // Criar usuários adicionais na mesma organização
    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: `user2_${randomUUID()}@test.com`,
        password: 'senha123',
        name: 'Usuário 2',
        role: 'ACCOUNTANT',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: `user3_${randomUUID()}@test.com`,
        password: 'senha123',
        name: 'Usuário 3',
        role: 'VIEWER',
      })
      .expect(201);
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /users', () => {
    const validateUser = (user: any) => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('isActive');
    };

    it('deve retornar array de usuários da organização', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // OWNER + 2 criados
      response.body.forEach(validateUser);
    });

    it('deve retornar 403 para VIEWER', async () => {
      const viewer = await createAuthenticatedUser(app, prisma, {
        role: 'VIEWER',
      });

      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .expect(403);
    });

    it('deve retornar apenas usuários da organização do usuário', async () => {
      // Criar usuário em outra organização
      const user2 = await createAuthenticatedUser(app, prisma);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que não há usuário da outra org
      const hasOtherOrgUser = response.body.some(
        (user: any) => user.id === user2.userId
      );
      expect(hasOtherOrgUser).toBe(false);
    });
  });

  describe('GET /users/:id', () => {
    it('deve retornar usuário por ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
    });

    it('deve retornar 404 para usuário inexistente', () => {
      return request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('deve retornar 404 para usuário de outra organização', async () => {
      const user2 = await createAuthenticatedUser(app, prisma);

      return request(app.getHttpServer())
        .get(`/api/users/${user2.userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('deve retornar 403 para VIEWER tentando ver outro usuário', async () => {
      const viewer = await createAuthenticatedUser(app, prisma, {
        role: 'VIEWER',
      });

      return request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .expect(403);
    });
  });
});
