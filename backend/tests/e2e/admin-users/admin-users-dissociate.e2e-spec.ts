import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { randomUUID } from 'node:crypto';

describe('Admin Users - Dissociate (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let systemAdminToken: string;
  let userId: string;
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

    // Criar usuário e organização e associar
    userId = randomUUID();
    organizationId = randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        email: `dissociate-${userId}@example.com`,
        name: 'User to Dissociate',
        password: await import('bcryptjs').then(bcrypt =>
          bcrypt.hash('pass123', 10)
        ),
        isActive: true,
        isSystemAdmin: false,
      },
    });

    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Organization to Dissociate',
        isActive: true,
      },
    });

    // Associar
    await prisma.userOrganization.create({
      data: {
        userId,
        organizationId,
        role: 'ADMIN',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('DELETE /admin/users/:userId/organizations/:organizationId', () => {
    it('deve desassociar usuário da organização', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/admin/users/${userId}/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('organization');

      const association = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      expect(association).toBeNull();
    });

    it('deve retornar 404 para associação inexistente', async () => {
      const otherUserId = randomUUID();
      const otherOrgId = randomUUID();

      await request(app.getHttpServer())
        .delete(`/api/admin/users/${otherUserId}/organizations/${otherOrgId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(404);
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .delete(`/api/admin/users/${userId}/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .expect(403);
    });
  });
});
