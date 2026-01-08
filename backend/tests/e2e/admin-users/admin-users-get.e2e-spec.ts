import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Admin Users - GET (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let systemAdminToken: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    // Criar system admin
    const auth = await createAuthenticatedUser(app, prisma, {
      isSystemAdmin: true,
    });
    systemAdminToken = auth.accessToken;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /admin/users', () => {
    it('deve listar todos os usuários do sistema', async () => {
      // Criar alguns usuários adicionais
      await createAuthenticatedUser(app, prisma, { name: 'User 1' });
      await createAuthenticatedUser(app, prisma, { name: 'User 2' });

      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // Pelo menos os criados
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('isSystemAdmin');
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .expect(403);
    });

    it('deve retornar 401 sem autenticação', async () => {
      await request(app.getHttpServer()).get('/api/admin/users').expect(401);
    });
  });
});
