import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { randomUUID } from 'node:crypto';

describe('Admin Organizations - GET by ID (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let systemAdminToken: string;
  let organizationId: string;

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

    // Criar organização de teste
    organizationId = randomUUID();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Test Organization',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /admin/organizations/:id', () => {
    it('deve retornar organização com usuários', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admin/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('users');
      expect(response.body.id).toBe(organizationId);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('deve retornar 404 para organização inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/organizations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(404);
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .get(`/api/admin/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .expect(403);
    });
  });
});
