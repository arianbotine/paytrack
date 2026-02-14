import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Organization - PATCH (e2e)', () => {
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

    const auth = await createAuthenticatedUser(app, prisma, {
      role: 'OWNER', // OWNER pode atualizar
    });
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('PATCH /organization', () => {
    it('deve atualizar organização', async () => {
      const updateData = {
        name: 'Nome Atualizado',
        email: 'contato@atualizado.com',
        phone: '(11) 99999-9999',
        notificationLeadDays: 10,
        notificationPollingSeconds: 120,
        showOverdueNotifications: false,
      };

      const response = await request(app.getHttpServer())
        .patch('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
      expect(response.body.phone).toBe(updateData.phone);
      expect(response.body.notificationLeadDays).toBe(
        updateData.notificationLeadDays
      );
      expect(response.body.notificationPollingSeconds).toBe(
        updateData.notificationPollingSeconds
      );
      expect(response.body.showOverdueNotifications).toBe(
        updateData.showOverdueNotifications
      );

      const updated = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      expect(updated?.name).toBe(updateData.name);
      expect(updated?.email).toBe(updateData.email);
      expect(updated?.notificationLeadDays).toBe(10);
    });

    it('deve atualizar apenas campos enviados', async () => {
      const original = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const updateData = { name: 'Apenas Nome' };

      const response = await request(app.getHttpServer())
        .patch('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(original?.email); // Mantém original
    });

    it('deve retornar 400 para dados inválidos', () => {
      return request(app.getHttpServer())
        .patch('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'email-invalido' }) // Email inválido
        .expect(400);
    });

    it('deve retornar 400 para configurações inválidas de notificação', () => {
      return request(app.getHttpServer())
        .patch('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          notificationLeadDays: 0,
          notificationPollingSeconds: 10,
        })
        .expect(400);
    });

    it('VIEWER não deve poder atualizar organização', async () => {
      const viewer = await createAuthenticatedUser(app, prisma, {
        role: 'VIEWER',
      });

      return request(app.getHttpServer())
        .patch('/api/organization')
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ name: 'Tentativa' })
        .expect(403);
    });
  });
});
