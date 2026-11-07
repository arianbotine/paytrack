import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
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

describe('[Relatórios] GET /api/reports/pending-accounts', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;
  let otherOrganizationId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
    otherOrganizationId = randomUUID();
    await prisma.organization.create({
      data: {
        id: otherOrganizationId,
        name: 'Other Test Organization',
        isActive: true,
      },
    });
  });

  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.payableInstallmentItemTag.deleteMany({});
    await prisma.payableInstallmentItem.deleteMany({});
    await prisma.payableInstallmentTag.deleteMany({});
    await prisma.receivableInstallmentTag.deleteMany({});
    await prisma.payableInstallment.deleteMany({});
    await prisma.receivableInstallment.deleteMany({});
    await prisma.payable.deleteMany({});
    await prisma.receivable.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.vendor.deleteMany({});
    await prisma.customer.deleteMany({});
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  function dateOffset(days: number): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }

  it('retorna lista vazia e exige autenticação', async () => {
    const emptyResponse = await request(app.getHttpServer())
      .get('/api/reports/pending-accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(emptyResponse.body).toMatchObject({
      data: [],
      total: 0,
      summary: {
        payableCount: 0,
        receivableCount: 0,
        payableOutstandingAmount: 0,
        receivableOutstandingAmount: 0,
      },
    });

    await request(app.getHttpServer())
      .get('/api/reports/pending-accounts')
      .expect(401);
  });

  it('combina parcelas abertas, filtra e pagina com isolamento da organização', async () => {
    const vendorFactory = new VendorFactory(prisma);
    const customerFactory = new CustomerFactory(prisma);
    const vendor = await vendorFactory.create({ organizationId });
    const otherVendor = await vendorFactory.create({
      organizationId: otherOrganizationId,
    });
    const customer = await customerFactory.create({ organizationId });
    const payableFactory = new PayableFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const overduePayable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      amount: 1000,
      dueDate: dateOffset(-1),
    });
    const upcomingPayable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      amount: 600,
      dueDate: dateOffset(1),
    });
    const partialReceivable = await receivableFactory.create({
      organizationId,
      customerId: customer.id,
      amount: 2000,
      dueDate: dateOffset(2),
      status: 'PARTIAL',
    });
    await prisma.receivableInstallment.update({
      where: { id: partialReceivable.installments[0].id },
      data: { receivedAmount: 300 },
    });

    const paidPayable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      amount: 500,
      dueDate: dateOffset(1),
      status: 'PAID',
    });
    const zeroBalancePayable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      amount: 400,
      dueDate: dateOffset(1),
    });
    await prisma.payableInstallment.update({
      where: { id: paidPayable.installments[0].id },
      data: { paidAmount: 500 },
    });
    await prisma.payableInstallment.update({
      where: { id: zeroBalancePayable.installments[0].id },
      data: { paidAmount: 400 },
    });

    await payableFactory.create({
      organizationId: otherOrganizationId,
      vendorId: otherVendor.id,
      amount: 900,
      dueDate: dateOffset(-2),
    });

    const firstPage = await request(app.getHttpServer())
      .get('/api/reports/pending-accounts?skip=0&take=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(firstPage.body.total).toBe(2);
    expect(firstPage.body.data).toHaveLength(1);
    expect(firstPage.body.data[0]).toMatchObject({
      type: 'PAYABLE',
      accountId: upcomingPayable.id,
      amount: 600,
      settledAmount: 0,
      outstandingAmount: 600,
      isOverdue: false,
    });
    expect(firstPage.body.summary).toMatchObject({
      payableCount: 1,
      receivableCount: 1,
      payableOutstandingAmount: 600,
      receivableOutstandingAmount: 1700,
    });

    const secondPage = await request(app.getHttpServer())
      .get('/api/reports/pending-accounts?skip=1&take=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(secondPage.body.data[0]).toMatchObject({
      type: 'RECEIVABLE',
      accountId: partialReceivable.id,
      settledAmount: 300,
      outstandingAmount: 1700,
      status: 'PARTIAL',
      isOverdue: false,
    });

    const overdue = await request(app.getHttpServer())
      .get('/api/reports/pending-accounts?dueStatus=OVERDUE')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(overdue.body.total).toBe(1);
    expect(overdue.body.data[0]).toMatchObject({
      type: 'PAYABLE',
      accountId: overduePayable.id,
      outstandingAmount: 1000,
      isOverdue: true,
    });

    const filtered = await request(app.getHttpServer())
      .get(
        `/api/reports/pending-accounts?type=RECEIVABLE&startDate=${dateOffset(2).toISOString().slice(0, 10)}&endDate=${dateOffset(2).toISOString().slice(0, 10)}`
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(filtered.body.total).toBe(1);
    expect(filtered.body.data[0].counterpartyName).toBe(customer.name);
    expect(filtered.body.data[0].counterpartyName).not.toContain(
      otherVendor.name
    );
  });

  it('rejeita intervalo de vencimento inválido', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/reports/pending-accounts?startDate=2026-12-01&endDate=2026-11-01'
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(response.body.message).toContain(
      'A data inicial não pode ser posterior à data final'
    );
  });
});
