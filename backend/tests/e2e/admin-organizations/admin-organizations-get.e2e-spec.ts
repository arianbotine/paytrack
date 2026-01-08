import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Admin Organizations - GET (e2e)', () => {
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
      role: 'OWNER',
    });
    systemAdminToken = auth.accessToken;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /admin/organizations', () => {
    it('deve listar todas as organizações do sistema', async () => {
      // Criar algumas organizações adicionais
      const org1Id = randomUUID();
      const org2Id = randomUUID();
      await prisma.organization.createMany({
        data: [
          {
            id: org1Id,
            name: 'Org 1',
            isActive: true,
          },
          {
            id: org2Id,
            name: 'Org 2',
            isActive: true,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/organizations')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // Pelo menos as criadas + a do setup
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('isActive');
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .get('/api/admin/organizations')
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .expect(403);
    });

    it('deve retornar 401 sem autenticação', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/organizations')
        .expect(401);
    });
  });
});
