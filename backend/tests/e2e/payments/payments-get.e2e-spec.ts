import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import { randomUUID } from 'node:crypto';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  PaymentFactory,
  PayableFactory,
  ReceivableFactory,
  VendorFactory,
  CustomerFactory,
} from '../../factories';

describe('[Pagamentos] GET /api/payments', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve retornar lista vazia quando não há pagamentos', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [],
      total: 0,
    });
  });

  it('deve retornar pagamentos da organização', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const paymentFactory = new PaymentFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    const payable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
    });

    const installment = await prisma.payableInstallment.findFirst({
      where: { payableId: payable.id },
    });

    await paymentFactory.create({
      organizationId,
      amount: 1000,
      allocations: [
        {
          accountType: 'PAYABLE',
          accountId: payable.id,
          installmentId: installment!.id,
          amount: 1000,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      amount: 1000,
      organizationId,
    });
  });

  it('não deve retornar pagamentos de outras organizações', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const { organizationId: otherOrgId } = await createAuthenticatedUser(
      app,
      prisma
    );
    const paymentFactory = new PaymentFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor1 = await vendorFactory.create({ organizationId });
    const vendor2 = await vendorFactory.create({ organizationId: otherOrgId });

    const payable1 = await payableFactory.create({
      organizationId,
      vendorId: vendor1.id,
    });
    const payable2 = await payableFactory.create({
      organizationId: otherOrgId,
      vendorId: vendor2.id,
    });

    const inst1 = await prisma.payableInstallment.findFirst({
      where: { payableId: payable1.id },
    });
    const inst2 = await prisma.payableInstallment.findFirst({
      where: { payableId: payable2.id },
    });

    await paymentFactory.create({
      organizationId,
      allocations: [
        {
          accountType: 'PAYABLE',
          accountId: payable1.id,
          installmentId: inst1!.id,
          amount: 1000,
        },
      ],
    });
    await paymentFactory.create({
      organizationId: otherOrgId,
      allocations: [
        {
          accountType: 'PAYABLE',
          accountId: payable2.id,
          installmentId: inst2!.id,
          amount: 1000,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].organizationId).toBe(organizationId);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    await request(app.getHttpServer()).get('/api/payments').expect(401);
  });
});

describe('[Pagamentos] POST /api/payments/quick', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve fazer baixa rápida de conta a pagar', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    const payable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      amount: 1500,
    });

    const installment = await prisma.payableInstallment.findFirst({
      where: { payableId: payable.id },
    });

    const response = await request(app.getHttpServer())
      .post('/api/payments/quick')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        type: 'payable',
        installmentId: installment?.id,
        amount: 1500,
        paymentDate: '2026-01-08T10:00:00.000Z',
        paymentMethod: 'PIX',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      amount: 1500,
      paymentMethod: 'PIX',
    });

    // Verificar que a parcela foi marcada como paga
    const updatedInstallment = await prisma.payableInstallment.findUnique({
      where: { id: installment?.id },
    });
    expect(updatedInstallment?.status).toBe('PAID');
  });

  it('deve fazer baixa rápida de conta a receber', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });
    const receivable = await receivableFactory.create({
      organizationId,
      customerId: customer.id,
      amount: 2000,
    });

    const installment = await prisma.receivableInstallment.findFirst({
      where: { receivableId: receivable.id },
    });

    const response = await request(app.getHttpServer())
      .post('/api/payments/quick')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        type: 'receivable',
        installmentId: installment?.id,
        amount: 2000,
        paymentDate: '2026-01-08T15:00:00.000Z',
        paymentMethod: 'BANK_TRANSFER',
      })
      .expect(201);

    expect(response.body.amount).toBe(2000);

    const updatedInstallment = await prisma.receivableInstallment.findUnique({
      where: { id: installment?.id },
    });
    expect(updatedInstallment?.status).toBe('PAID');
  });
});
