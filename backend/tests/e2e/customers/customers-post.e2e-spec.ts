import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Customers - POST (e2e)', () => {
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

  describe('POST /customers', () => {
    it('deve criar cliente e persistir no banco', async () => {
      const customerData = {
        name: 'Novo Cliente',
        document: '12345678901',
        email: 'cliente@example.com',
        phone: '11999999999',
      };

      const response = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(customerData.name);
      expect(response.body.document).toBe(customerData.document);
      expect(response.body.email).toBe(customerData.email);

      const customerInDb = await prisma.customer.findUnique({
        where: { id: response.body.id },
      });

      expect(customerInDb).toBeTruthy();
      expect(customerInDb?.name).toBe(customerData.name);
      expect(customerInDb?.organizationId).toBe(organizationId);
    });

    it('deve criar cliente com campos opcionais vazios', async () => {
      const customerData = {
        name: 'Cliente Mínimo',
        document: '98765432100',
      };

      const response = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body.name).toBe(customerData.name);
      expect(response.body.document).toBe(customerData.document);
      expect(response.body.email).toBeNull();
      expect(response.body.phone).toBeNull();
    });

    it('deve associar cliente à organização do usuário logado', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Cliente Multi-Tenancy',
          document: '11122233344',
        })
        .expect(201);

      const customer = await prisma.customer.findUnique({
        where: { id: response.body.id },
      });

      expect(customer?.organizationId).toBe(organizationId);
    });

    it('deve retornar 400 para dados inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' }) // Nome vazio
        .expect(400);
    });
  });
});
