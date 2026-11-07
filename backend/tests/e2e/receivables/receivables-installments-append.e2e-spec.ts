import { INestApplication } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CustomerFactory, ReceivableFactory } from '../../factories';

describe('Receivables Installments - append (e2e)', () => {
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

  it('adds installments with exact cents and preserves existing receipts', async () => {
    const customer = await new CustomerFactory(prisma).create({
      organizationId,
    });
    const receivable = await new ReceivableFactory(
      prisma
    ).createWithInstallments(2, {
      organizationId,
      customerId: customer.id,
      amount: 200,
      dueDate: new Date('2026-01-15T00:00:00.000Z'),
    });
    const existingInstallment = receivable.installments[0];

    await prisma.payment.create({
      data: {
        organizationId,
        amount: 25,
        paymentDate: new Date('2026-01-20T12:00:00.000Z'),
        paymentMethod: 'PIX',
        allocations: {
          create: {
            receivableInstallmentId: existingInstallment.id,
            amount: 25,
          },
        },
      },
    });
    await prisma.receivableInstallment.update({
      where: { id: existingInstallment.id },
      data: {
        receivedAmount: new Prisma.Decimal(25),
        status: AccountStatus.PARTIAL,
      },
    });
    await prisma.receivable.update({
      where: { id: receivable.id },
      data: {
        receivedAmount: new Prisma.Decimal(25),
        status: AccountStatus.PARTIAL,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/receivables/${receivable.id}/installments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amountCents: 10000,
        installmentCount: 3,
        dueDates: ['2026-03-15', '2026-04-15', '2026-05-15'],
      })
      .expect(201);

    const updatedReceivable = await prisma.receivable.findUniqueOrThrow({
      where: { id: receivable.id },
      include: {
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    const installmentTotal = updatedReceivable.installments.reduce(
      (sum, installment) => sum.plus(installment.amount),
      new Prisma.Decimal(0)
    );

    expect(updatedReceivable.amount.equals(new Prisma.Decimal(300))).toBe(true);
    expect(installmentTotal.equals(updatedReceivable.amount)).toBe(true);
    expect(
      updatedReceivable.receivedAmount.equals(new Prisma.Decimal(25))
    ).toBe(true);
    expect(updatedReceivable.status).toBe(AccountStatus.PARTIAL);
    expect(updatedReceivable.installments).toHaveLength(5);
    expect(
      updatedReceivable.installments.map(installment =>
        installment.amount.toFixed(2)
      )
    ).toEqual(['100.00', '100.00', '33.33', '33.33', '33.34']);
    expect(
      updatedReceivable.installments.every(
        installment => installment.totalInstallments === 5
      )
    ).toBe(true);
    expect(
      updatedReceivable.installments[0].receivedAmount.equals(
        new Prisma.Decimal(25)
      )
    ).toBe(true);
    expect(
      await prisma.paymentAllocation.count({
        where: { receivableInstallmentId: existingInstallment.id },
      })
    ).toBe(1);
  });

  it('rejects adding installments to a paid account or below-cent amounts', async () => {
    const customer = await new CustomerFactory(prisma).create({
      organizationId,
    });
    const receivable = await new ReceivableFactory(prisma).createWithStatus(
      'PAID',
      { organizationId, customerId: customer.id, amount: 100 }
    );
    const endpoint = `/api/receivables/${receivable.id}/installments`;

    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amountCents: 100,
        installmentCount: 1,
        dueDates: ['2027-01-31'],
      })
      .expect(400);

    const openReceivable = await new ReceivableFactory(prisma).create({
      organizationId,
      customerId: customer.id,
      amount: 100,
    });

    await request(app.getHttpServer())
      .post(`/api/receivables/${openReceivable.id}/installments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amountCents: 1,
        installmentCount: 2,
        dueDates: ['2027-01-31', '2027-02-28'],
      })
      .expect(400);

    expect(
      await prisma.receivableInstallment.count({
        where: { receivableId: openReceivable.id },
      })
    ).toBe(1);
  });
});
