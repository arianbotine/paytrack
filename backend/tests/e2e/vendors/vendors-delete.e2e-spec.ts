import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { VendorFactory } from '../../factories';

describe('Vendors - DELETE (e2e)', () => {
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

  describe('DELETE /vendors/:id', () => {
    it('deve excluir fornecedor', async () => {
      const factory = new VendorFactory(prisma);
      const vendor = await factory.create({
        organizationId,
        name: 'Fornecedor para Deletar',
        document: '12345678000123',
      });

      await request(app.getHttpServer())
        .delete(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deleted = await prisma.vendor.findUnique({
        where: { id: vendor.id },
      });

      expect(deleted).toBeNull();
    });

    it('deve retornar 404 para fornecedor inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/api/vendors/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('deve retornar 404 para fornecedor de outra organização', async () => {
      const otherAuth = await createAuthenticatedUser(app, prisma);
      const factory = new VendorFactory(prisma);
      const vendor = await factory.create({
        organizationId: otherAuth.organizationId,
        name: 'Fornecedor Outra Org',
      });

      await request(app.getHttpServer())
        .delete(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
