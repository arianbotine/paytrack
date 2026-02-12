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

describe('[Pagamentos] PATCH /api/payments/:id', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve atualizar data de registro de um pagamento', async () => {
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

    const installment = await prisma.payableInstallment.findFirst({
      where: { payableId: payable.id },
    });

    // Criar pagamento inicial
    const createResponse = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 1000,
        paymentDate: '2026-01-08T10:00:00.000Z',
        paymentMethod: 'PIX',
        notes: 'Pagamento inicial',
        allocations: [
          {
            payableInstallmentId: installment?.id,
            amount: 1000,
          },
        ],
      })
      .expect(201);

    const paymentId = createResponse.body.id;

    // Atualizar data de registro
    const newPaymentDate = '2026-01-10T14:30:00.000Z';
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        paymentDate: newPaymentDate,
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: paymentId,
      paymentDate: newPaymentDate,
      paymentMethod: 'PIX',
      notes: 'Pagamento inicial',
      organizationId,
    });

    // Verificar que a data foi realmente atualizada no banco
    const paymentInDb = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    expect(paymentInDb?.paymentDate.toISOString()).toBe(newPaymentDate);
  });

  it('deve atualizar forma de pagamento', async () => {
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

    // Criar recebimento inicial
    const createResponse = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 2000,
        paymentDate: '2026-01-08T15:00:00.000Z',
        paymentMethod: 'PIX',
        allocations: [
          {
            receivableInstallmentId: installment?.id,
            amount: 2000,
          },
        ],
      })
      .expect(201);

    const paymentId = createResponse.body.id;

    // Atualizar forma de pagamento
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        paymentDate: '2026-01-08T15:00:00.000Z',
        paymentMethod: 'BANK_TRANSFER',
      })
      .expect(200);

    expect(updateResponse.body.paymentMethod).toBe('BANK_TRANSFER');

    // Verificar no banco
    const paymentInDb = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    expect(paymentInDb?.paymentMethod).toBe('BANK_TRANSFER');
  });

  it('deve atualizar referência e observações', async () => {
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

    // Criar pagamento sem referência e observações
    const createResponse = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 1500,
        paymentDate: '2026-01-09T10:00:00.000Z',
        paymentMethod: 'CREDIT_CARD',
        allocations: [
          {
            payableInstallmentId: installment?.id,
            amount: 1500,
          },
        ],
      })
      .expect(201);

    const paymentId = createResponse.body.id;

    // Adicionar referência e observações
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        paymentDate: '2026-01-09T10:00:00.000Z',
        reference: 'Comprovante PIX 123456',
        notes: 'Pagamento atualizado com sucesso',
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: paymentId,
      reference: 'Comprovante PIX 123456',
      notes: 'Pagamento atualizado com sucesso',
    });

    // Verificar no banco
    const paymentInDb = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    expect(paymentInDb?.reference).toBe('Comprovante PIX 123456');
    expect(paymentInDb?.notes).toBe('Pagamento atualizado com sucesso');
  });

  it('deve atualizar todos os campos de uma vez', async () => {
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
      amount: 3000,
    });

    const installment = await prisma.payableInstallment.findFirst({
      where: { payableId: payable.id },
    });

    // Criar pagamento inicial
    const createResponse = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 3000,
        paymentDate: '2026-01-05T09:00:00.000Z',
        paymentMethod: 'CASH',
        reference: 'Ref antiga',
        notes: 'Notas antigas',
        allocations: [
          {
            payableInstallmentId: installment?.id,
            amount: 3000,
          },
        ],
      })
      .expect(201);

    const paymentId = createResponse.body.id;

    // Atualizar todos os campos
    const newPaymentDate = '2026-01-11T16:45:00.000Z';
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        paymentDate: newPaymentDate,
        paymentMethod: 'DEBIT_CARD',
        reference: 'Nova referência 789',
        notes: 'Notas atualizadas',
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: paymentId,
      paymentDate: newPaymentDate,
      paymentMethod: 'DEBIT_CARD',
      reference: 'Nova referência 789',
      notes: 'Notas atualizadas',
      organizationId,
    });

    // Verificar no banco
    const paymentInDb = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    expect(paymentInDb?.paymentDate.toISOString()).toBe(newPaymentDate);
    expect(paymentInDb?.paymentMethod).toBe('DEBIT_CARD');
    expect(paymentInDb?.reference).toBe('Nova referência 789');
    expect(paymentInDb?.notes).toBe('Notas atualizadas');
  });

  it('deve retornar 404 quando pagamento não existe', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);
    const fakePaymentId = randomUUID();

    await request(app.getHttpServer())
      .patch(`/api/payments/${fakePaymentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        paymentDate: '2026-01-10T14:30:00.000Z',
      })
      .expect(404);
  });

  it('deve retornar 404 quando tentar atualizar pagamento de outra organização', async () => {
    // Criar pagamento na organização 1
    const { organizationId: org1Id, accessToken: token1 } =
      await createAuthenticatedUser(app, prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor1 = await vendorFactory.create({ organizationId: org1Id });
    const payable1 = await payableFactory.create({
      organizationId: org1Id,
      vendorId: vendor1.id,
      amount: 1000,
    });

    const installment1 = await prisma.payableInstallment.findFirst({
      where: { payableId: payable1.id },
    });

    const createResponse = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${token1}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 1000,
        paymentDate: '2026-01-08T10:00:00.000Z',
        paymentMethod: 'PIX',
        allocations: [
          {
            payableInstallmentId: installment1?.id,
            amount: 1000,
          },
        ],
      })
      .expect(201);

    const paymentId = createResponse.body.id;

    // Tentar atualizar com usuário da organização 2
    const { accessToken: token2 } = await createAuthenticatedUser(app, prisma);

    await request(app.getHttpServer())
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({
        paymentDate: '2026-01-10T14:30:00.000Z',
      })
      .expect(404);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    const fakePaymentId = randomUUID();

    await request(app.getHttpServer())
      .patch(`/api/payments/${fakePaymentId}`)
      .send({
        paymentDate: '2026-01-10T14:30:00.000Z',
      })
      .expect(401);
  });

  it('deve validar que paymentDate é obrigatório', async () => {
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

    const installment = await prisma.payableInstallment.findFirst({
      where: { payableId: payable.id },
    });

    // Criar pagamento
    const createResponse = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 1000,
        paymentDate: '2026-01-08T10:00:00.000Z',
        paymentMethod: 'PIX',
        allocations: [
          {
            payableInstallmentId: installment?.id,
            amount: 1000,
          },
        ],
      })
      .expect(201);

    const paymentId = createResponse.body.id;

    // Tentar atualizar sem paymentDate
    await request(app.getHttpServer())
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        paymentMethod: 'CASH',
      })
      .expect(400);
  });

  it('não deve permitir atualizar valor ou alocações', async () => {
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

    const installment = await prisma.payableInstallment.findFirst({
      where: { payableId: payable.id },
    });

    // Criar pagamento
    const createResponse = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amount: 1000,
        paymentDate: '2026-01-08T10:00:00.000Z',
        paymentMethod: 'PIX',
        allocations: [
          {
            payableInstallmentId: installment?.id,
            amount: 1000,
          },
        ],
      })
      .expect(201);

    const paymentId = createResponse.body.id;
    const originalAmount = createResponse.body.amount;
    const originalAllocations = createResponse.body.allocations;

    // Atualizar apenas data e verificar que valor e alocações permanecem inalterados
    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        paymentDate: '2026-01-10T14:30:00.000Z',
        notes: 'Data atualizada',
      })
      .expect(200);

    // Amount e alocações não devem ter mudado
    expect(updateResponse.body.amount).toBe(originalAmount);
    expect(updateResponse.body.allocations).toHaveLength(
      originalAllocations.length
    );
    expect(updateResponse.body.allocations[0].amount).toBe(
      originalAllocations[0].amount
    );

    // Verificar no banco
    const paymentInDb = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        allocations: true,
      },
    });

    expect(Number(paymentInDb?.amount)).toBe(originalAmount);
    expect(paymentInDb?.allocations).toHaveLength(originalAllocations.length);
    expect(Number(paymentInDb?.allocations[0].amount)).toBe(
      originalAllocations[0].amount
    );
  });
});
