import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Admin Organizations - POST (e2e)', () => {
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

  describe('POST /admin/organizations', () => {
    it('deve criar nova organização', async () => {
      const orgData = {
        name: 'Nova Organização Admin',
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/organizations')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(orgData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(orgData.name);
      expect(response.body.isActive).toBe(true); // Padrão

      const orgInDb = await prisma.organization.findUnique({
        where: { id: response.body.id },
      });

      expect(orgInDb).toBeTruthy();
      expect(orgInDb?.name).toBe(orgData.name);
    });

    it('deve retornar 400 para dados inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/organizations')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ name: '' }) // Nome vazio
        .expect(400);
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .post('/api/admin/organizations')
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .send({ name: 'Test Org' })
        .expect(403);
    });
  });
});
