import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CustomerFactory } from '../../factories';

describe('Customers - DELETE (e2e)', () => {
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

  describe('DELETE /customers/:id', () => {
    it('deve excluir cliente', async () => {
      const factory = new CustomerFactory(prisma);
      const customer = await factory.create({
        organizationId,
        name: 'Cliente para Deletar',
        document: '12345678901',
      });

      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deleted = await prisma.customer.findUnique({
        where: { id: customer.id },
      });

      expect(deleted).toBeNull();
    });

    it('deve retornar 404 para cliente inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/api/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('deve retornar 404 para cliente de outra organização', async () => {
      const otherAuth = await createAuthenticatedUser(app, prisma);
      const factory = new CustomerFactory(prisma);
      const customer = await factory.create({
        organizationId: otherAuth.organizationId,
        name: 'Cliente Outra Org',
      });

      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
