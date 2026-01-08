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
  PayableFactory,
  ReceivableFactory,
  VendorFactory,
  CustomerFactory,
} from '../../factories';

describe('[Pagamentos] POST /api/payments', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve criar pagamento para conta a pagar', async () => {
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
      amount: 1000,
    });

    // Buscar a parcela criada
    const installment = await prisma.payableInstallment.findFirst({
      where: { payableId: payable.id },
    });

    const response = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 1000,
        paymentDate: '2026-01-08T10:00:00.000Z',
        paymentMethod: 'PIX',
        notes: 'Pagamento via PIX',
        allocations: [
          {
            payableInstallmentId: installment?.id,
            amount: 1000,
          },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      amount: 1000,
      paymentMethod: 'PIX',
      notes: 'Pagamento via PIX',
      organizationId,
    });

    expect(response.body.allocations).toHaveLength(1);
    expect(response.body.allocations[0]).toMatchObject({
      payableInstallmentId: installment?.id,
      amount: 1000,
    });
  });

  it('deve criar pagamento para conta a receber', async () => {
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
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 2000,
        paymentDate: '2026-01-08T15:00:00.000Z',
        paymentMethod: 'BANK_TRANSFER',
        allocations: [
          {
            receivableInstallmentId: installment?.id,
            amount: 2000,
          },
        ],
      })
      .expect(201);

    expect(response.body.allocations).toHaveLength(1);
    expect(response.body.allocations[0].receivableInstallmentId).toBe(
      installment?.id
    );
  });

  it('deve criar pagamento com múltiplas alocações', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    const payable1 = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      amount: 500,
    });
    const payable2 = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      amount: 800,
    });

    const installment1 = await prisma.payableInstallment.findFirst({
      where: { payableId: payable1.id },
    });
    const installment2 = await prisma.payableInstallment.findFirst({
      where: { payableId: payable2.id },
    });

    const response = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 1300,
        paymentDate: '2026-01-08T12:00:00.000Z',
        paymentMethod: 'CASH',
        allocations: [
          {
            payableInstallmentId: installment1?.id,
            amount: 500,
          },
          {
            payableInstallmentId: installment2?.id,
            amount: 800,
          },
        ],
      })
      .expect(201);

    expect(response.body.allocations).toHaveLength(2);
    expect(response.body.amount).toBe(1300);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    await request(app.getHttpServer())
      .post('/api/payments')
      .send({
        amount: 1000,
        paymentDate: '2026-01-08T10:00:00.000Z',
        paymentMethod: 'PIX',
        allocations: [],
      })
      .expect(401);
  });
});
