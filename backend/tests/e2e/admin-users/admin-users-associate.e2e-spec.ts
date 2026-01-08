import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { randomUUID } from 'node:crypto';

describe('Admin Users - Associate (e2e)', () => {
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

    // Criar usuário e organização para associar
    userId = randomUUID();
    organizationId = randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        email: `associate-${userId}@example.com`,
        name: 'User to Associate',
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
        name: 'Organization to Associate',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('POST /admin/users/:userId/organizations/:organizationId', () => {
    it('deve associar usuário a organização', async () => {
      const associateData = {
        role: 'ADMIN',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(associateData)
        .expect(201);

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

      expect(association).toBeTruthy();
      expect(association?.role).toBe('ADMIN');
      expect(association?.isActive).toBe(true);
    });

    it('deve associar com role OWNER por padrão', async () => {
      const newUserId = randomUUID();
      const newOrgId = randomUUID();

      await prisma.user.create({
        data: {
          id: newUserId,
          email: `owner-${newUserId}@example.com`,
          name: 'Owner User',
          password: await import('bcryptjs').then(bcrypt =>
            bcrypt.hash('pass123', 10)
          ),
          isActive: true,
          isSystemAdmin: false,
        },
      });

      await prisma.organization.create({
        data: {
          id: newOrgId,
          name: 'Owner Organization',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .post(`/api/admin/users/${newUserId}/organizations/${newOrgId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ role: 'OWNER' }) // Role OWNER por padrão
        .expect(201);

      const association = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: newUserId,
            organizationId: newOrgId,
          },
        },
      });

      expect(association?.role).toBe('OWNER'); // Padrão
    });

    it('deve retornar 404 para usuário inexistente', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/admin/users/00000000-0000-0000-0000-000000000000/organizations/${organizationId}`
        )
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ role: 'VIEWER' })
        .expect(404);
    });

    it('deve retornar 404 para organização inexistente', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/admin/users/${userId}/organizations/00000000-0000-0000-0000-000000000000`
        )
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ role: 'VIEWER' })
        .expect(404);
    });

    it('deve retornar 400 para associação já existente', async () => {
      // Já associou no primeiro teste, tentar novamente
      await request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ role: 'VIEWER' })
        .expect(409);
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .send({ role: 'VIEWER' })
        .expect(403);
    });
  });
});
