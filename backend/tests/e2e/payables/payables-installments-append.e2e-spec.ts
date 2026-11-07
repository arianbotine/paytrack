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
import { PayableFactory, VendorFactory } from '../../factories';

describe('Payables Installments - append (e2e)', () => {
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

  it('adds installments with exact cents and preserves existing payments', async () => {
    const vendor = await new VendorFactory(prisma).create({ organizationId });
    const payable = await new PayableFactory(prisma).createWithInstallments(2, {
      organizationId,
      vendorId: vendor.id,
      amount: 200,
      dueDate: new Date('2026-01-15T00:00:00.000Z'),
    });
    const existingInstallment = payable.installments[0];

    await prisma.payment.create({
      data: {
        organizationId,
        amount: 25,
        paymentDate: new Date('2026-01-20T12:00:00.000Z'),
        paymentMethod: 'PIX',
        allocations: {
          create: {
            payableInstallmentId: existingInstallment.id,
            amount: 25,
          },
        },
      },
    });
    await prisma.payableInstallment.update({
      where: { id: existingInstallment.id },
      data: {
        paidAmount: new Prisma.Decimal(25),
        status: AccountStatus.PARTIAL,
      },
    });
    await prisma.payable.update({
      where: { id: payable.id },
      data: {
        paidAmount: new Prisma.Decimal(25),
        status: AccountStatus.PARTIAL,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/payables/${payable.id}/installments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amountCents: 10000,
        installmentCount: 3,
        dueDates: ['2026-03-15', '2026-04-15', '2026-05-15'],
      })
      .expect(201);

    const updatedPayable = await prisma.payable.findUniqueOrThrow({
      where: { id: payable.id },
      include: {
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    const installmentTotal = updatedPayable.installments.reduce(
      (sum, installment) => sum.plus(installment.amount),
      new Prisma.Decimal(0)
    );

    expect(updatedPayable.amount.equals(new Prisma.Decimal(300))).toBe(true);
    expect(installmentTotal.equals(updatedPayable.amount)).toBe(true);
    expect(updatedPayable.paidAmount.equals(new Prisma.Decimal(25))).toBe(true);
    expect(updatedPayable.status).toBe(AccountStatus.PARTIAL);
    expect(updatedPayable.installments).toHaveLength(5);
    expect(
      updatedPayable.installments.map(installment =>
        installment.amount.toFixed(2)
      )
    ).toEqual(['100.00', '100.00', '33.33', '33.33', '33.34']);
    expect(
      updatedPayable.installments.every(
        installment => installment.totalInstallments === 5
      )
    ).toBe(true);
    expect(
      updatedPayable.installments[0].paidAmount.equals(new Prisma.Decimal(25))
    ).toBe(true);
    expect(
      await prisma.paymentAllocation.count({
        where: { payableInstallmentId: existingInstallment.id },
      })
    ).toBe(1);
  });

  it('rejects adding installments to a paid account or below-cent amounts', async () => {
    const vendor = await new VendorFactory(prisma).create({ organizationId });
    const payable = await new PayableFactory(prisma).createWithStatus('PAID', {
      organizationId,
      vendorId: vendor.id,
      amount: 100,
    });
    const endpoint = `/api/payables/${payable.id}/installments`;

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

    const openPayable = await new PayableFactory(prisma).create({
      organizationId,
      vendorId: vendor.id,
      amount: 100,
    });

    await request(app.getHttpServer())
      .post(`/api/payables/${openPayable.id}/installments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        amountCents: 1,
        installmentCount: 2,
        dueDates: ['2027-01-31', '2027-02-28'],
      })
      .expect(400);

    expect(
      await prisma.payableInstallment.count({
        where: { payableId: openPayable.id },
      })
    ).toBe(1);
  });
});
