import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Notifications - GET due-alerts (e2e)', () => {
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

    const auth = await createAuthenticatedUser(app, prisma, { role: 'OWNER' });
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;

    const vendor = await prisma.vendor.create({
      data: { name: 'Fornecedor A', organizationId },
    });

    const customer = await prisma.customer.create({
      data: { name: 'Cliente B', organizationId },
    });

    const payable = await prisma.payable.create({
      data: {
        organizationId,
        vendorId: vendor.id,
        amount: 1000,
        paidAmount: 0,
        status: 'PENDING',
        totalInstallments: 1,
      },
    });

    const receivable = await prisma.receivable.create({
      data: {
        organizationId,
        customerId: customer.id,
        amount: 500,
        receivedAmount: 0,
        status: 'PENDING',
        totalInstallments: 1,
      },
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const in3Days = new Date(today);
    in3Days.setUTCDate(in3Days.getUTCDate() + 3);

    const in15Days = new Date(today);
    in15Days.setUTCDate(in15Days.getUTCDate() + 15);

    await prisma.payableInstallment.create({
      data: {
        payableId: payable.id,
        organizationId,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 1000,
        paidAmount: 0,
        dueDate: yesterday,
        status: 'PENDING',
      },
    });

    await prisma.receivableInstallment.create({
      data: {
        receivableId: receivable.id,
        organizationId,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 500,
        receivedAmount: 0,
        dueDate: in3Days,
        status: 'PARTIAL',
      },
    });

    await prisma.receivableInstallment.create({
      data: {
        receivableId: receivable.id,
        organizationId,
        installmentNumber: 2,
        totalInstallments: 2,
        amount: 800,
        receivedAmount: 0,
        dueDate: in15Days,
        status: 'PENDING',
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve retornar vencidas e próximas na janela configurada, ordenadas por prioridade', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/notifications/due-alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.length).toBe(2);

    expect(response.body.data[0].isOverdue).toBe(true);
    expect(response.body.data[1].isOverdue).toBe(false);

    expect(response.body.data[0].accountType).toBe('PAYABLE');
    expect(response.body.data[1].accountType).toBe('RECEIVABLE');

    // Parcela fora da janela (15 dias) não deve vir com leadDays padrão 7
    const hasFarFuture = response.body.data.some(
      (item: any) => item.daysUntilDue > 7
    );
    expect(hasFarFuture).toBe(false);
  });

  it('não deve retornar dados de outra organização', async () => {
    const other = await createAuthenticatedUser(app, prisma, {
      organizationName: 'Outra Org',
      role: 'OWNER',
    });

    const response = await request(app.getHttpServer())
      .get('/api/notifications/due-alerts')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  it('deve respeitar configuração de não incluir vencidas', async () => {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { showOverdueNotifications: false },
    });

    const response = await request(app.getHttpServer())
      .get('/api/notifications/due-alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data.every((item: any) => !item.isOverdue)).toBe(true);
  });
});
