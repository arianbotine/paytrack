import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  ReceivableFactory,
  CategoryFactory,
  CustomerFactory,
  TagFactory,
} from '../../factories';

describe('[Contas a Receber] GET /api/receivables', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve retornar lista vazia quando não há contas a receber', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/receivables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [],
      total: 0,
    });
  });

  it('deve retornar contas a receber da organização', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });
    await receivableFactory.createMany(3, {
      organizationId,
      customerId: customer.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/receivables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.total).toBe(3);
  });

  it('deve filtrar contas a receber por status', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });

    await receivableFactory.createWithStatus('PENDING', {
      organizationId,
      customerId: customer.id,
    });
    await receivableFactory.createWithStatus('PAID', {
      organizationId,
      customerId: customer.id,
    });
    await receivableFactory.createWithStatus('PENDING', {
      organizationId,
      customerId: customer.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/receivables?status=PENDING')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(
      response.body.data.every(
        (r: { status: string }) => r.status === 'PENDING'
      )
    ).toBe(true);
  });

  it('deve filtrar contas a receber por categoria', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const categoryFactory = new CategoryFactory(prisma);
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const category = await categoryFactory.create({
      organizationId,
      type: 'RECEIVABLE',
    });
    const customer = await customerFactory.create({ organizationId });

    await receivableFactory.create({
      organizationId,
      customerId: customer.id,
      categoryId: category.id,
    });
    await receivableFactory.create({ organizationId, customerId: customer.id });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables?categoryId=${category.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].categoryId).toBe(category.id);
  });

  it('deve filtrar contas a receber por devedor (customer)', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer1 = await customerFactory.create({ organizationId });
    const customer2 = await customerFactory.create({ organizationId });

    await receivableFactory.create({
      organizationId,
      customerId: customer1.id,
    });
    await receivableFactory.create({
      organizationId,
      customerId: customer2.id,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables?customerId=${customer1.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].customerId).toBe(customer1.id);
  });

  it('deve filtrar contas a receber por tag', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const tagFactory = new TagFactory(prisma);
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const tag = await tagFactory.create({ organizationId });
    const customer = await customerFactory.create({ organizationId });

    await receivableFactory.create({
      organizationId,
      customerId: customer.id,
      tags: [tag.id],
    });
    await receivableFactory.create({ organizationId, customerId: customer.id });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables?tagIds=${tag.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });

  it('deve suportar paginação', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });
    await receivableFactory.createMany(25, {
      organizationId,
      customerId: customer.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/receivables?skip=10&take=10')
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
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer1 = await customerFactory.create({ organizationId });
    const customer2 = await customerFactory.create({
      organizationId: otherOrgId,
    });

    await receivableFactory.create({
      organizationId,
      customerId: customer1.id,
    });
    await receivableFactory.create({
      organizationId: otherOrgId,
      customerId: customer2.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/receivables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].organizationId).toBe(organizationId);
  });

  it('deve ocultar contas concluídas quando hideCompleted=true', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });

    await receivableFactory.createWithStatus('PENDING', {
      organizationId,
      customerId: customer.id,
    });
    await receivableFactory.createWithStatus('PAID', {
      organizationId,
      customerId: customer.id,
    });
    await receivableFactory.createWithStatus('PARTIAL', {
      organizationId,
      customerId: customer.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/receivables?hideCompleted=true')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(
      response.body.data.every((r: { status: string }) => r.status !== 'PAID')
    ).toBe(true);
  });

  it('deve incluir contas concluídas quando hideCompleted=false', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });

    await receivableFactory.createWithStatus('PENDING', {
      organizationId,
      customerId: customer.id,
    });
    await receivableFactory.createWithStatus('PAID', {
      organizationId,
      customerId: customer.id,
    });
    await receivableFactory.createWithStatus('PARTIAL', {
      organizationId,
      customerId: customer.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/receivables?hideCompleted=false')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(
      response.body.data.some((r: { status: string }) => r.status === 'PAID')
    ).toBe(true);
  }, 100000);

  it('deve retornar 401 quando não autenticado', async () => {
    await request(app.getHttpServer()).get('/api/receivables').expect(401);
  });

  describe('Validação de campo isOverdue', () => {
    it('deve marcar isOverdue=true para parcelas com data anterior a hoje', async () => {
      const { organizationId, accessToken } = await createAuthenticatedUser(
        app,
        prisma
      );
      const customerFactory = new CustomerFactory(prisma);
      const receivableFactory = new ReceivableFactory(prisma);

      const customer = await customerFactory.create({ organizationId });

      // Data passada (ontem) - criar em UTC para evitar problemas de timezone
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 100,
        dueDate: yesterday,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/receivables')
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
      const customerFactory = new CustomerFactory(prisma);
      const receivableFactory = new ReceivableFactory(prisma);

      const customer = await customerFactory.create({ organizationId });

      // Data de hoje - criar em UTC para evitar problemas de timezone
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 100,
        dueDate: today,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/receivables')
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
      const customerFactory = new CustomerFactory(prisma);
      const receivableFactory = new ReceivableFactory(prisma);

      const customer = await customerFactory.create({ organizationId });

      // Data futura (amanhã) - criar em UTC para evitar problemas de timezone
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 100,
        dueDate: tomorrow,
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .get('/api/receivables')
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
      const customerFactory = new CustomerFactory(prisma);
      const receivableFactory = new ReceivableFactory(prisma);

      const customer = await customerFactory.create({ organizationId });

      // Data de hoje mas com horas diferentes - ambas devem ter isOverdue=false
      const todayMorning = new Date();
      todayMorning.setUTCHours(8, 30, 0, 0);

      const todayNight = new Date();
      todayNight.setUTCHours(23, 59, 59, 999);

      await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 100,
        dueDate: todayMorning,
        status: 'PENDING',
        installmentCount: 1,
      });

      await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 200,
        dueDate: todayNight,
        status: 'PENDING',
        installmentCount: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/api/receivables')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      // Ambas devem ter isOverdue=false pois a data é hoje (independente da hora)
      expect(
        response.body.data.every(
          (r: any) => r.installments[0].isOverdue === false
        )
      ).toBe(true);
    });
  });
});
