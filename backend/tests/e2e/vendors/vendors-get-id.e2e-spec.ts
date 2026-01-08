import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { VendorFactory } from '../../factories';

describe('Vendors - Get by ID (e2e)', () => {
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

  describe('GET /vendors/:id', () => {
    it('deve retornar fornecedor por ID', async () => {
      const factory = new VendorFactory(prisma);
      const vendor = await factory.create({
        organizationId,
        name: 'Fornecedor Teste',
        document: '12345678000123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('document');
      expect(response.body.id).toBe(vendor.id);
      expect(response.body.name).toBe('Fornecedor Teste');
      expect(response.body.document).toBe('12345678000123');
    });

    it('deve retornar 404 para fornecedor inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/vendors/00000000-0000-0000-0000-000000000000')
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
        .get(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
