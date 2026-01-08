import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { randomUUID } from 'node:crypto';

describe('Admin Organizations - PATCH (e2e)', () => {
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
        name: 'Organization to Update',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('PATCH /admin/organizations/:id', () => {
    it('deve atualizar organização existente', async () => {
      const updateData = {
        name: 'Organization Updated',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/admin/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.isActive).toBe(true); // Não alterado

      const updated = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      expect(updated?.name).toBe(updateData.name);
    });

    it('deve atualizar apenas campos enviados', async () => {
      const orgId = randomUUID();
      await prisma.organization.create({
        data: {
          id: orgId,
          name: 'Original Name',
          isActive: true,
        },
      });

      const updateData = { name: 'Updated Name' };

      const response = await request(app.getHttpServer())
        .patch(`/api/admin/organizations/${orgId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.isActive).toBe(true); // Não alterado
    });

    it('deve retornar 404 para organização inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/organizations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .patch(`/api/admin/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .send({ name: 'Attempt' })
        .expect(403);
    });

    it('deve retornar 400 para dados inválidos', async () => {
      await request(app.getHttpServer())
        .patch(`/api/admin/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ name: '' }) // Nome vazio
        .expect(400);
    });
  });
});
