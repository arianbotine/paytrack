import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import { randomUUID } from 'node:crypto';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory, VendorFactory } from '../../factories';

describe('[Contas a Pagar] POST /api/payables', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve criar conta a pagar com dados válidos', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const vendor = await vendorFactory.create({ organizationId });

    const createResponse = await request(app.getHttpServer())
      .post('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        notes: 'Aluguel Janeiro',
        amount: 5000,
        dueDates: ['2026-01-31'],
        vendorId: vendor.id,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      notes: 'Aluguel Janeiro',
      amount: 5000,
      organizationId,
      status: 'PENDING',
    });

    // Buscar com installments via GET
    const getResponse = await request(app.getHttpServer())
      .get(`/api/payables/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.installments).toHaveLength(1);
    expect(getResponse.body.installments[0]).toMatchObject({
      installmentNumber: 1,
      totalInstallments: 1,
      amount: 5000,
      status: 'PENDING',
    });

    const payable = await prisma.payable.findUnique({
      where: { id: createResponse.body.id },
    });
    expect(payable).toBeDefined();
  });

  it('deve criar conta a pagar com múltiplas parcelas', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const vendor = await vendorFactory.create({ organizationId });

    const createResponse = await request(app.getHttpServer())
      .post('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        notes: 'Compra parcelada',
        amount: 3000,
        installmentCount: 3,
        dueDates: ['2026-02-01', '2026-03-01', '2026-04-01'],
        vendorId: vendor.id,
      })
      .expect(201);

    // Buscar com installments via GET
    const getResponse = await request(app.getHttpServer())
      .get(`/api/payables/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.installments).toHaveLength(3);
    expect(getResponse.body.installments[0].amount).toBe(1000);
    expect(getResponse.body.installments[1].amount).toBe(1000);
    expect(getResponse.body.installments[2].amount).toBe(1000);

    const firstDue = new Date(getResponse.body.installments[0].dueDate);
    const secondDue = new Date(getResponse.body.installments[1].dueDate);
    expect(secondDue.getMonth() - firstDue.getMonth()).toBe(1);
  });

  it('deve criar conta a pagar com categoria', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const categoryFactory = new CategoryFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);

    const category = await categoryFactory.create({
      organizationId,
      type: 'PAYABLE',
    });
    const vendor = await vendorFactory.create({ organizationId });

    const response = await request(app.getHttpServer())
      .post('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        notes: 'Despesa categorizada',
        amount: 1000,
        dueDates: ['2026-03-01'],
        categoryId: category.id,
        vendorId: vendor.id,
      })
      .expect(201);

    expect(response.body.categoryId).toBe(category.id);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    await request(app.getHttpServer())
      .post('/api/payables')
      .send({
        notes: 'Teste',
        amount: 1000,
        dueDates: ['2026-09-01'],
      })
      .expect(401);
  });
});
