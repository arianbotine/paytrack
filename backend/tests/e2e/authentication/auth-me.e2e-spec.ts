import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Auth - Me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /auth/me', () => {
    it('deve retornar perfil do usuário logado', async () => {
      const auth = await createAuthenticatedUser(app, prisma);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('availableOrganizations');
      expect(response.body.id).toBe(auth.userId);
      expect(response.body.email).toBe(auth.email);
    });

    it('deve retornar 401 sem autenticação', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });
});
