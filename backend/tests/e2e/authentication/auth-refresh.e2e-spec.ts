import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Auth - Refresh (e2e)', () => {
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

  describe('POST /auth/refresh', () => {
    it('deve renovar tokens com refresh token válido', async () => {
      // Criar usuário e fazer login para obter refresh token
      const auth = await createAuthenticatedUser(app, prisma);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: auth.email,
          password: 'testpassword123',
        })
        .expect(200);

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : setCookieHeader;
      const refreshToken = refreshTokenCookie.split(';')[0].split('=')[1];

      // For tests, send refresh token in Authorization header
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('user');
      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body.user.id).toBe(auth.userId);
    });

    it('deve retornar 401 sem refresh token', async () => {
      await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
    });

    it('deve retornar 401 com refresh token inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=invalid')
        .expect(401);
    });
  });
});
