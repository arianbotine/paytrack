import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import { randomUUID } from 'node:crypto';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory, CustomerFactory } from '../../factories';

describe('[Contas a Receber] POST /api/receivables', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve criar conta a receber com dados válidos', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const customer = await customerFactory.create({ organizationId });

    const createResponse = await request(app.getHttpServer())
      .post('/api/receivables')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        notes: 'Venda Janeiro',
        amount: 5000,
        dueDates: ['2026-01-31'],
        customerId: customer.id,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      notes: 'Venda Janeiro',
      amount: 5000,
      organizationId,
      status: 'PENDING',
    });

    // Buscar com installments via GET
    const getResponse = await request(app.getHttpServer())
      .get(`/api/receivables/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.installments).toHaveLength(1);
    expect(getResponse.body.installments[0]).toMatchObject({
      installmentNumber: 1,
      totalInstallments: 1,
      amount: 5000,
      status: 'PENDING',
    });

    const receivable = await prisma.receivable.findUnique({
      where: { id: createResponse.body.id },
    });
    expect(receivable).toBeDefined();
  });

  it('deve criar conta a receber com múltiplas parcelas', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const customer = await customerFactory.create({ organizationId });

    const createResponse = await request(app.getHttpServer())
      .post('/api/receivables')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        notes: 'Venda parcelada',
        amount: 3000,
        installmentCount: 3,
        dueDates: ['2026-02-01', '2026-03-01', '2026-04-01'],
        customerId: customer.id,
      })
      .expect(201);

    // Buscar com installments via GET
    const getResponse = await request(app.getHttpServer())
      .get(`/api/receivables/${createResponse.body.id}`)
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

  it('deve criar conta a receber com categoria', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const categoryFactory = new CategoryFactory(prisma);
    const customerFactory = new CustomerFactory(prisma);

    const category = await categoryFactory.create({
      organizationId,
      type: 'RECEIVABLE',
      name: 'Vendas',
    });
    const customer = await customerFactory.create({ organizationId });

    const response = await request(app.getHttpServer())
      .post('/api/receivables')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        notes: 'Venda com categoria',
        amount: 2500,
        dueDates: ['2026-03-15'],
        customerId: customer.id,
        categoryId: category.id,
      })
      .expect(201);

    expect(response.body.categoryId).toBe(category.id);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    await request(app.getHttpServer())
      .post('/api/receivables')
      .send({
        notes: 'Teste',
        amount: 1000,
        dueDates: ['2026-01-31'],
        customerId: randomUUID(),
      })
      .expect(401);
  });
});
