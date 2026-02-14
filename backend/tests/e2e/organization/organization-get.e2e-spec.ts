import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Organization - GET (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /organization', () => {
    it('deve retornar dados da organização atual', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(organizationId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('document');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('phone');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('notificationLeadDays');
      expect(response.body).toHaveProperty('notificationPollingSeconds');
      expect(response.body).toHaveProperty('showOverdueNotifications');
    });

    it('deve retornar 401 sem autenticação', () => {
      return request(app.getHttpServer()).get('/api/organization').expect(401);
    });

    it('deve retornar dados da organização correta para cada usuário', async () => {
      const user2 = await createAuthenticatedUser(app, prisma, {
        organizationName: 'Org 2',
      });

      const response2 = await request(app.getHttpServer())
        .get('/api/organization')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      expect(response2.body.name).toBe('Org 2');

      // Verificar que user1 vê sua org
      const response1 = await request(app.getHttpServer())
        .get('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response1.body.id).toBe(organizationId);
      expect(response1.body.id).not.toBe(response2.body.id);
    });
  });
});
