import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Vendors - POST (e2e)', () => {
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

  describe('POST /vendors', () => {
    it('deve criar fornecedor e persistir no banco', async () => {
      const vendorData = {
        name: 'Novo Fornecedor',
        document: '12345678000123',
        email: 'fornecedor@example.com',
        phone: '11999999999',
      };

      const response = await request(app.getHttpServer())
        .post('/api/vendors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(vendorData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(vendorData.name);
      expect(response.body.document).toBe(vendorData.document);
      expect(response.body.email).toBe(vendorData.email);

      const vendorInDb = await prisma.vendor.findUnique({
        where: { id: response.body.id },
      });

      expect(vendorInDb).toBeTruthy();
      expect(vendorInDb?.name).toBe(vendorData.name);
      expect(vendorInDb?.organizationId).toBe(organizationId);
    });

    it('deve criar fornecedor com campos opcionais vazios', async () => {
      const vendorData = {
        name: 'Fornecedor Mínimo',
        document: '98765432000145',
      };

      const response = await request(app.getHttpServer())
        .post('/api/vendors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(vendorData)
        .expect(201);

      expect(response.body.name).toBe(vendorData.name);
      expect(response.body.document).toBe(vendorData.document);
      expect(response.body.email).toBeNull();
      expect(response.body.phone).toBeNull();
    });

    it('deve associar fornecedor à organização do usuário logado', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/vendors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Fornecedor Multi-Tenancy',
          document: '11122233000155',
        })
        .expect(201);

      const vendor = await prisma.vendor.findUnique({
        where: { id: response.body.id },
      });

      expect(vendor?.organizationId).toBe(organizationId);
    });

    it('deve retornar 400 para dados inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/vendors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' }) // Nome vazio
        .expect(400);
    });
  });
});
