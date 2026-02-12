import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  PayableFactory,
  CategoryFactory,
  VendorFactory,
  TagFactory,
} from '../../factories';

describe('[Contas a Pagar] GET /api/payables', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve retornar lista vazia quando não há contas a pagar', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [],
      total: 0,
    });
  });

  it('deve retornar contas a pagar da organização', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    await payableFactory.createMany(3, { organizationId, vendorId: vendor.id });

    const response = await request(app.getHttpServer())
      .get('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.total).toBe(3);
  });

  it('deve filtrar contas a pagar por status', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.createWithStatus('PENDING', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PAID', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PENDING', {
      organizationId,
      vendorId: vendor.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables?status=PENDING')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(
      response.body.data.every(
        (p: { status: string }) => p.status === 'PENDING'
      )
    ).toBe(true);
  });

  it('deve filtrar contas a pagar por categoria', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const categoryFactory = new CategoryFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const category = await categoryFactory.create({
      organizationId,
      type: 'PAYABLE',
    });
    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      categoryId: category.id,
    });
    await payableFactory.create({ organizationId, vendorId: vendor.id });

    const response = await request(app.getHttpServer())
      .get(`/api/payables?categoryId=${category.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].categoryId).toBe(category.id);
  });

  it('deve filtrar contas a pagar por credor', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor1 = await vendorFactory.create({ organizationId });
    const vendor2 = await vendorFactory.create({ organizationId });

    await payableFactory.create({ organizationId, vendorId: vendor1.id });
    await payableFactory.create({ organizationId, vendorId: vendor2.id });

    const response = await request(app.getHttpServer())
      .get(`/api/payables?vendorId=${vendor1.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].vendorId).toBe(vendor1.id);
  });

  it('deve filtrar contas a pagar por tag', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const tagFactory = new TagFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const tag = await tagFactory.create({ organizationId });
    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      tags: [tag.id],
    });
    await payableFactory.create({ organizationId, vendorId: vendor.id });

    const response = await request(app.getHttpServer())
      .get(`/api/payables?tagIds=${tag.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });

  it('deve suportar paginação', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    await payableFactory.createMany(25, {
      organizationId,
      vendorId: vendor.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables?skip=10&take=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(10);
    expect(response.body.total).toBe(25);
  });

  it('não deve retornar contas de outras organizações', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const { organizationId: otherOrgId } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor1 = await vendorFactory.create({ organizationId });
    const vendor2 = await vendorFactory.create({ organizationId: otherOrgId });

    await payableFactory.create({ organizationId, vendorId: vendor1.id });
    await payableFactory.create({
      organizationId: otherOrgId,
      vendorId: vendor2.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].organizationId).toBe(organizationId);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    await request(app.getHttpServer()).get('/api/payables').expect(401);
  });

  describe('Validação de campo isOverdue', () => {
    it('deve marcar isOverdue=true para parcelas com data anterior a hoje', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      // Data passada (ontem) - criar em UTC para evitar problemas de timezone
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 100,
        dueDate: yesterday,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].installments).toHaveLength(1);
      expect(response.body.data[0].installments[0].isOverdue).toBe(true);
    });

    it('deve marcar isOverdue=false para parcelas com data igual a hoje', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      // Data de hoje - criar em UTC para evitar problemas de timezone
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 100,
        dueDate: today,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].installments).toHaveLength(1);
      expect(response.body.data[0].installments[0].isOverdue).toBe(false);
    });

    it('deve marcar isOverdue=false para parcelas com data posterior a hoje', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      // Data futura (amanhã) - criar em UTC para evitar problemas de timezone
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 100,
        dueDate: tomorrow,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].installments).toHaveLength(1);
      expect(response.body.data[0].installments[0].isOverdue).toBe(false);
    });

    it('deve validar isOverdue considerando apenas data, não hora', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      // Data de hoje mas com horas diferentes - ambas devem ter isOverdue=false
      const todayMorning = new Date();
      todayMorning.setUTCHours(8, 30, 0, 0);

      const todayNight = new Date();
      todayNight.setUTCHours(23, 59, 59, 999);

      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 100,
        dueDate: todayMorning,
        status: 'PENDING',
        installmentCount: 1,
      });

      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 200,
        dueDate: todayNight,
        status: 'PENDING',
        installmentCount: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      // Ambas devem ter isOverdue=false pois a data é hoje (independente da hora)
      expect(
        response.body.data.every(
          (p: any) => p.installments[0].isOverdue === false
        )
      ).toBe(true);
    });
  });

  describe('Filtro de mês do próximo vencimento (nextDueMonth)', () => {
    it('deve retornar apenas contas com primeira parcela pendente no mês especificado', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      // Parcela para fevereiro de 2026
      const feb2026 = new Date('2026-02-15');
      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 100,
        dueDate: feb2026,
        status: 'PENDING',
      });

      // Parcela para março de 2026
      const mar2026 = new Date('2026-03-15');
      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 200,
        dueDate: mar2026,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables?nextDueMonth=2026-02')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].amount).toBe(100);
    });

    it('não deve retornar contas que já tenham parcelas pendentes em mês anterior', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      // Conta com 3 parcelas: jan, fev, mar
      const payable1 = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 300,
        installmentCount: 3,
        status: 'PENDING',
      });

      // Atualizar datas das parcelas para jan, fev, mar
      await prisma.payableInstallment.update({
        where: { id: payable1.installments[0].id },
        data: { dueDate: new Date('2026-01-15') },
      });
      await prisma.payableInstallment.update({
        where: { id: payable1.installments[1].id },
        data: { dueDate: new Date('2026-02-15') },
      });
      await prisma.payableInstallment.update({
        where: { id: payable1.installments[2].id },
        data: { dueDate: new Date('2026-03-15') },
      });

      // Conta com apenas uma parcela em fevereiro
      const feb2026 = new Date('2026-02-10');
      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 100,
        dueDate: feb2026,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables?nextDueMonth=2026-02')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Deve retornar apenas a conta que tem fevereiro como primeira parcela pendente
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].amount).toBe(100);
    });

    it('deve retornar contas com parcelas pagas antes e próxima pendente no mês', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      // Conta com 3 parcelas: jan (paga), fev (pendente), mar (pendente)
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 300,
        installmentCount: 3,
        status: 'PARTIAL',
      });

      // Atualizar datas das parcelas para jan, fev, mar
      await prisma.payableInstallment.update({
        where: { id: payable.installments[0].id },
        data: { dueDate: new Date('2026-01-15') },
      });
      await prisma.payableInstallment.update({
        where: { id: payable.installments[1].id },
        data: { dueDate: new Date('2026-02-15') },
      });
      await prisma.payableInstallment.update({
        where: { id: payable.installments[2].id },
        data: { dueDate: new Date('2026-03-15') },
      });

      // Marcar primeira parcela como paga
      await prisma.payableInstallment.updateMany({
        where: {
          payableId: payable.id,
          installmentNumber: 1,
        },
        data: {
          status: 'PAID',
          paidAmount: 100,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables?nextDueMonth=2026-02')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Deve retornar a conta pois fevereiro é a próxima parcela pendente
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(payable.id);
    });

    it('não deve retornar contas totalmente pagas', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor = await vendorFactory.create({ organizationId });

      const feb2026 = new Date('2026-02-15');
      await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 100,
        dueDate: feb2026,
        status: 'PAID',
      });

      const response = await request(app.getHttpServer())
        .get('/api/payables?nextDueMonth=2026-02')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('deve validar formato incorreto do filtro nextDueMonth', async () => {
      const { accessToken } = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .get('/api/payables?nextDueMonth=202602') // Formato incorreto
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/payables?nextDueMonth=2026/02') // Formato incorreto
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/payables?nextDueMonth=02-2026') // Formato incorreto
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('deve combinar filtro nextDueMonth com outros filtros', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const vendorFactory = new VendorFactory(prisma);
      const categoryFactory = new CategoryFactory(prisma);
      const payableFactory = new PayableFactory(prisma);

      const vendor1 = await vendorFactory.create({ organizationId });
      const vendor2 = await vendorFactory.create({ organizationId });
      const category = await categoryFactory.create({
        organizationId,
        type: 'PAYABLE',
      });

      const feb2026 = new Date('2026-02-15');

      // Conta 1: vendor1, com categoria, fevereiro
      await payableFactory.create({
        organizationId,
        vendorId: vendor1.id,
        categoryId: category.id,
        amount: 100,
        dueDate: feb2026,
        status: 'PENDING',
      });

      // Conta 2: vendor2, sem categoria, fevereiro
      await payableFactory.create({
        organizationId,
        vendorId: vendor2.id,
        amount: 200,
        dueDate: feb2026,
        status: 'PENDING',
      });

      // Filtrar por vendor1 E fevereiro
      const response = await request(app.getHttpServer())
        .get(`/api/payables?nextDueMonth=2026-02&vendorId=${vendor1.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].vendorId).toBe(vendor1.id);
      expect(response.body.data[0].amount).toBe(100);
    });
  });
});
