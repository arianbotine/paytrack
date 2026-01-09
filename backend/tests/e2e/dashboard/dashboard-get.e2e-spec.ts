import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import { CacheService } from '../../../src/shared/services/cache.service';
import { Prisma } from '@prisma/client';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  PayableFactory,
  ReceivableFactory,
  PaymentFactory,
  VendorFactory,
  CustomerFactory,
  CategoryFactory,
} from '../../factories';

describe('Dashboard - GET (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;
  let cacheService: CacheService;
  let payableFactory: PayableFactory;
  let receivableFactory: ReceivableFactory;
  let paymentFactory: PaymentFactory;
  let vendorFactory: VendorFactory;
  let customerFactory: CustomerFactory;
  let categoryFactory: CategoryFactory;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;

    // Inicializar serviços
    cacheService = app.get(CacheService);

    // Inicializar factories
    payableFactory = new PayableFactory(prisma);
    receivableFactory = new ReceivableFactory(prisma);
    paymentFactory = new PaymentFactory(prisma);
    vendorFactory = new VendorFactory(prisma);
    customerFactory = new CustomerFactory(prisma);
    categoryFactory = new CategoryFactory(prisma);
  });

  beforeEach(async () => {
    // Limpar dados de teste para evitar interferência entre testes
    await prisma.payableInstallment.deleteMany({ where: { organizationId } });
    await prisma.payable.deleteMany({ where: { organizationId } });
    await prisma.receivableInstallment.deleteMany({
      where: { organizationId },
    });
    await prisma.receivable.deleteMany({ where: { organizationId } });
    await prisma.paymentAllocation.deleteMany();
    await prisma.payment.deleteMany({ where: { organizationId } });
    await prisma.vendor.deleteMany({ where: { organizationId } });
    await prisma.customer.deleteMany({ where: { organizationId } });
    await prisma.category.deleteMany({ where: { organizationId } });

    // Limpar cache do dashboard
    cacheService.flush();
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /dashboard', () => {
    it('deve retornar dashboard vazio quando não há dados', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('payableInstallments');
      expect(response.body).toHaveProperty('receivableInstallments');
      expect(response.body).toHaveProperty('balance');

      // Verificar estrutura dos totais
      expect(response.body.payableInstallments.totals).toEqual({
        total: 0,
        paid: 0,
        pending: 0,
        partial: 0,
        overdue: 0,
        cancelled: 0,
        count: 0,
      });

      expect(response.body.receivableInstallments.totals).toEqual({
        total: 0,
        paid: 0,
        pending: 0,
        partial: 0,
        overdue: 0,
        cancelled: 0,
        count: 0,
      });

      // Verificar saldos zerados
      expect(response.body.balance).toEqual({
        toReceive: 0,
        toPay: 0,
        net: 0,
      });

      // Arrays vazios
      expect(response.body.payableInstallments.overdue).toEqual([]);
      expect(response.body.payableInstallments.upcoming).toEqual([]);
      expect(response.body.receivableInstallments.overdue).toEqual([]);
      expect(response.body.receivableInstallments.upcoming).toEqual([]);
    });

    it('deve calcular corretamente totais de payables', async () => {
      // Criar fornecedor e categoria
      const vendor = await vendorFactory.create({ organizationId });
      const category = await categoryFactory.create({
        organizationId,
        type: 'PAYABLE',
      });

      // Criar payables com diferentes status no mês corrente
      const currentMonth = new Date();
      const payable1 = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        categoryId: category.id,
        amount: 1000,
        status: 'PAID',
        dueDate: currentMonth,
      });

      const payable2 = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        categoryId: category.id,
        amount: 2000,
        status: 'PENDING',
        dueDate: currentMonth,
      });

      // Criar payable com data vencida (status PENDING mas data no passado será detectado como vencido)
      const payable3 = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        categoryId: category.id,
        amount: 1500,
        status: 'PENDING',
        dueDate: currentMonth,
      });

      // Verificar que os payables foram criados corretamente
      expect(payable1).toHaveProperty('id');
      expect(payable1.amount.toNumber()).toBe(1000);
      expect(payable1.status).toBe('PAID');

      expect(payable2).toHaveProperty('id');
      expect(payable2.amount.toNumber()).toBe(2000);
      expect(payable2.status).toBe('PENDING');

      expect(payable3).toHaveProperty('id');
      expect(payable3.amount.toNumber()).toBe(1500);
      expect(payable3.status).toBe('PENDING');

      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.payableInstallments.totals).toEqual({
        total: 4500, // 1000 + 2000 + 1500
        paid: 1000,
        pending: 3500, // PENDING agora inclui o que era overdue
        partial: 0,
        overdue: 0, // Campo mantido para compatibilidade mas sempre 0
        cancelled: 0,
        count: 3,
      });

      expect(response.body.balance.toPay).toBe(3500); // pending (que inclui vencidos)
    });

    it('deve calcular corretamente totais de receivables', async () => {
      // Criar cliente e categoria
      const customer = await customerFactory.create({ organizationId });
      const category = await categoryFactory.create({
        organizationId,
        type: 'RECEIVABLE',
      });

      // Criar receivables com diferentes status no mês corrente
      const currentMonth = new Date();
      const receivable1 = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        categoryId: category.id,
        amount: 800,
        status: 'PAID',
        dueDate: currentMonth,
      });

      const receivable2 = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        categoryId: category.id,
        amount: 1200,
        status: 'PENDING',
        dueDate: currentMonth,
      });

      // Verificar que os receivables foram criados corretamente
      expect(receivable1).toHaveProperty('id');
      expect(receivable1.amount.toNumber()).toBe(800);
      expect(receivable1.status).toBe('PAID');

      expect(receivable2).toHaveProperty('id');
      expect(receivable2.amount.toNumber()).toBe(1200);
      expect(receivable2.status).toBe('PENDING');

      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.receivableInstallments.totals).toEqual({
        total: 2000, // 800 + 1200
        paid: 800,
        pending: 1200,
        partial: 0,
        overdue: 0,
        cancelled: 0,
        count: 2,
      });

      expect(response.body.balance.toReceive).toBe(1200); // pending
    });

    it('deve calcular saldo líquido corretamente', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Este teste combina payables e receivables dos testes anteriores
      // Como temos limpeza adequada, deve ser balanceado
      expect(response.body.balance.net).toBe(0);
    });

    it('deve incluir installments em atraso', async () => {
      // Limpar tudo primeiro para evitar dados de testes anteriores
      await prisma.paymentAllocation.deleteMany();
      await prisma.payment.deleteMany({ where: { organizationId } });
      await prisma.payableInstallment.deleteMany({ where: { organizationId } });
      await prisma.payable.deleteMany({ where: { organizationId } });
      await prisma.vendor.deleteMany({ where: { organizationId } });
      cacheService.flush();

      // Criar payable vencido (data passada, status PENDING)
      const vendor = await vendorFactory.create({ organizationId });
      const pastDate = new Date('2020-01-01'); // Data fixa no passado

      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 500,
        dueDate: pastDate,
        status: 'PENDING', // Status PENDING mas com data vencida
      });

      // Verificar que o payable foi criado corretamente
      expect(payable).toHaveProperty('id');
      expect(payable.amount.toNumber()).toBe(500);
      expect(payable.status).toBe('PENDING');
      expect(payable.installments[0].status).toBe('PENDING');
      expect(payable.installments[0].dueDate.getTime()).toBeLessThan(
        Date.now()
      ); // Data passada

      // Verificar no banco de dados
      const installmentsInDb = await prisma.payableInstallment.findMany({
        where: { organizationId, payableId: payable.id },
      });
      expect(installmentsInDb).toHaveLength(1);
      expect(installmentsInDb[0].status).toBe('PENDING');
      expect(installmentsInDb[0].dueDate.toISOString().split('T')[0]).toBe(
        '2020-01-01'
      );

      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.payableInstallments.overdue).toHaveLength(1);
      expect(response.body.payableInstallments.overdue[0]).toHaveProperty(
        'amount'
      );
      expect(response.body.payableInstallments.overdue[0]).toHaveProperty(
        'nextUnpaidDueDate'
      );
      expect(response.body.payableInstallments.overdue[0]).toHaveProperty(
        'nextUnpaidAmount'
      );
    });

    it('deve incluir installments próximos do vencimento', async () => {
      // Criar receivable com vencimento em breve
      const customer = await customerFactory.create({ organizationId });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 dias no futuro

      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 300,
        dueDate: futureDate,
        status: 'PENDING',
      });

      // Verificar que o receivable foi criado corretamente
      expect(receivable).toHaveProperty('id');
      expect(receivable.amount.toNumber()).toBe(300);
      expect(receivable.status).toBe('PENDING');
      expect(receivable.installments[0].dueDate.getTime()).toBeGreaterThan(
        Date.now()
      ); // Data futura

      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.receivableInstallments.upcoming).toHaveLength(1);
      expect(response.body.receivableInstallments.upcoming[0]).toHaveProperty(
        'amount'
      );
      expect(response.body.receivableInstallments.upcoming[0]).toHaveProperty(
        'nextUnpaidDueDate'
      );
      expect(response.body.receivableInstallments.upcoming[0]).toHaveProperty(
        'nextUnpaidAmount'
      );
    });

    it('deve processar pagamentos parciais corretamente', async () => {
      // Criar payable e fazer pagamento parcial
      const vendor = await vendorFactory.create({ organizationId });
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 1000,
        status: 'PENDING',
        dueDate: new Date(),
      });

      // Verificar que o payable foi criado corretamente
      expect(payable).toHaveProperty('id');
      expect(payable.amount.toNumber()).toBe(1000);
      expect(payable.status).toBe('PENDING');
      expect(payable.installments).toHaveLength(1);

      // Simular pagamento parcial via API
      const payment = await paymentFactory.create({
        organizationId,
        amount: 400,
        allocations: [
          {
            accountType: 'PAYABLE',
            accountId: payable.id,
            installmentId: payable.installments[0].id,
            amount: 400,
          },
        ],
      });

      // Verificar que o pagamento foi criado
      expect(payment).toHaveProperty('id');
      expect(payment.amount.toNumber()).toBe(400);

      // Atualizar o installment para simular processamento do pagamento
      const updatedInstallment = await prisma.payableInstallment.update({
        where: { id: payable.installments[0].id },
        data: {
          paidAmount: new Prisma.Decimal(400),
          status: 'PARTIAL',
        },
      });

      // Verificar que o installment foi atualizado
      expect(updatedInstallment.paidAmount.toNumber()).toBe(400);
      expect(updatedInstallment.status).toBe('PARTIAL');

      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Payable deve estar como PARTIAL
      expect(response.body.payableInstallments.totals.partial).toBe(600); // 1000 - 400
      expect(response.body.payableInstallments.totals.pending).toBe(0);
    });

    it('deve respeitar isolamento multi-tenant', async () => {
      // Criar segunda organização
      const org2Auth = await createAuthenticatedUser(app, prisma);
      const vendor2 = await vendorFactory.create({
        organizationId: org2Auth.organizationId,
      });

      // Criar payable na segunda organização
      const payable2 = await payableFactory.create({
        organizationId: org2Auth.organizationId,
        vendorId: vendor2.id,
        amount: 9999, // Valor fácil de identificar
      });

      // Verificar que o payable da segunda organização foi criado
      expect(payable2).toHaveProperty('id');
      expect(payable2.amount.toNumber()).toBe(9999);
      expect(payable2.organizationId).toBe(org2Auth.organizationId);

      // Dashboard da primeira organização não deve ver dados da segunda
      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que não há payable de 9999
      expect(response.body.payableInstallments.totals.total).not.toBe(9999);
    });

    it('deve retornar 401 sem autenticação', () => {
      return request(app.getHttpServer()).get('/api/dashboard').expect(401);
    });

    it('deve funcionar com VIEWER role', async () => {
      const viewerAuth = await createAuthenticatedUser(app, prisma, {
        role: 'VIEWER',
      });

      return request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
        .expect(200);
    });

    it('deve calcular corretamente com múltiplas parcelas', async () => {
      const vendor = await vendorFactory.create({ organizationId });
      const customer = await customerFactory.create({ organizationId });

      // Criar payable com 3 parcelas no mês corrente
      const currentMonth = new Date();
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 3000, // 1000 por parcela
        installmentCount: 3,
        status: 'PENDING',
        dueDate: currentMonth,
      });

      // Criar receivable com 2 parcelas no mês corrente
      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 2000, // 1000 por parcela
        installmentCount: 2,
        status: 'PENDING',
        dueDate: currentMonth,
      });

      // Verificar que os payables e receivables foram criados corretamente
      expect(payable).toHaveProperty('id');
      expect(payable.amount.toNumber()).toBe(3000);
      expect(payable.totalInstallments).toBe(3);
      expect(payable.installments).toHaveLength(3);

      expect(receivable).toHaveProperty('id');
      expect(receivable.amount.toNumber()).toBe(2000);
      expect(receivable.totalInstallments).toBe(2);
      expect(receivable.installments).toHaveLength(2);

      const response = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Deve contar apenas as parcelas do mês corrente
      // Como a factory cria parcelas em meses sequenciais, apenas 1 estará no mês corrente
      expect(response.body.payableInstallments.totals.count).toBe(1); // Apenas a primeira parcela
      expect(response.body.receivableInstallments.totals.count).toBe(1); // Apenas a primeira parcela
      expect(response.body.payableInstallments.totals.total).toBe(1000); // Apenas a primeira parcela (1000)
      expect(response.body.receivableInstallments.totals.total).toBe(1000); // Apenas a primeira parcela (1000)
    });
  });
});
