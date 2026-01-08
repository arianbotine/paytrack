import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { VendorFactory } from '../../factories';

describe('Vendors - PATCH (e2e)', () => {
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

  describe('PATCH /vendors/:id', () => {
    it('deve atualizar fornecedor existente', async () => {
      const factory = new VendorFactory(prisma);
      const vendor = await factory.create({
        organizationId,
        name: 'Fornecedor Original',
        document: '12345678000123',
        email: 'original@example.com',
      });

      const updateData = {
        name: 'Fornecedor Atualizado',
        email: 'atualizado@example.com',
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
      expect(response.body.isActive).toBe(updateData.isActive);

      const updated = await prisma.vendor.findUnique({
        where: { id: vendor.id },
      });

      expect(updated?.name).toBe(updateData.name);
      expect(updated?.email).toBe(updateData.email);
      expect(updated?.isActive).toBe(updateData.isActive);
    });

    it('deve atualizar apenas campos enviados', async () => {
      const factory = new VendorFactory(prisma);
      const vendor = await factory.create({
        organizationId,
        name: 'Fornecedor Original',
        document: '12345678000123',
      });

      const updateData = { name: 'Nome Atualizado' };

      const response = await request(app.getHttpServer())
        .patch(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.document).toBe('12345678000123'); // Não alterado
    });

    it('deve retornar 404 para fornecedor inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/api/vendors/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Teste' })
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
        .patch(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Tentativa' })
        .expect(404);
    });

    it('deve retornar 400 para dados inválidos', async () => {
      const factory = new VendorFactory(prisma);
      const vendor = await factory.create({ organizationId });

      await request(app.getHttpServer())
        .patch(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' }) // Nome vazio
        .expect(400);
    });
  });
});
