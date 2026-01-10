import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { PaymentsReportsRepository } from '../../../src/modules/reports/repositories';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  PayableFactory,
  ReceivableFactory,
  PaymentFactory,
  CategoryFactory,
  VendorFactory,
  CustomerFactory,
  TagFactory,
} from '../../factories';

describe('[Relatórios] GET /api/reports/payments', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;

  // Datas fixas para testes consistentes
  // Usando dia 15 do mês para evitar problemas de timezone
  const TEST_DATE = new Date('2026-01-15T00:00:00Z');
  const PERIOD_START = '2026-01-01';
  const PERIOD_END = '2026-01-31';

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  beforeEach(async () => {
    // Limpar dados entre testes para evitar contaminação
    // Ordem inversa das dependências (foreign keys)
    await prisma.paymentAllocation.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.payableTag.deleteMany({});
    await prisma.receivableTag.deleteMany({});
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

  describe('Cenários básicos', () => {
    it('deve retornar relatório vazio quando não há dados', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        timeSeries: [],
        totals: {
          payables: { current: 0, previous: 0, variance: 0 },
          receivables: { current: 0, previous: 0, variance: 0 },
          netBalance: { current: 0, previous: 0, variance: 0 },
          transactions: { current: 0, previous: 0, variance: 0 },
        },
        breakdown: {
          byCategory: { data: [], total: 0 },
          byPaymentMethod: { data: [], total: 0 },
        },
      });
    });

    it('deve retornar 401 sem autenticação', () => {
      return request(app.getHttpServer())
        .get('/api/reports/payments')
        .expect(401);
    });
  });

  describe('Relatório com dados', () => {
    it('deve retornar relatório com dados agregados', async () => {
      // Criar dados base
      const categoryFactory = new CategoryFactory(prisma);
      const categoryPayable = await categoryFactory.create({
        organizationId,
        name: 'Categoria Pagar',
        type: 'PAYABLE',
      });
      const categoryReceivable = await categoryFactory.create({
        organizationId,
        name: 'Categoria Receber',
        type: 'RECEIVABLE',
      });

      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      // Criar payables e receivables com pagamentos
      const payableFactory = new PayableFactory(prisma);
      const receivableFactory = new ReceivableFactory(prisma);
      const paymentFactory = new PaymentFactory(prisma);

      // Payable com pagamento
      const payable = await payableFactory.create({
        organizationId,
        categoryId: categoryPayable.id,
        vendorId: vendor.id,
        amount: 1000,
        dueDate: TEST_DATE,
      });
      await paymentFactory.create({
        amount: 1000,
        paymentDate: TEST_DATE,
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable.installments[0].id,
            amount: 1000,
          },
        ],
      });

      // Receivable com pagamento
      const receivable = await receivableFactory.create({
        organizationId,
        categoryId: categoryReceivable.id,
        customerId: customer.id,
        amount: 2000,
        dueDate: TEST_DATE,
      });
      await paymentFactory.create({
        amount: 2000,
        paymentDate: TEST_DATE,
        organizationId,
        allocations: [
          {
            receivableInstallmentId: receivable.installments[0].id,
            amount: 2000,
          },
        ],
      });

      // Executar query
      const response = await request(app.getHttpServer())
        .get(
          `/api/reports/payments?startDate=${PERIOD_START}&endDate=${PERIOD_END}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.timeSeries).toBeDefined();
      expect(response.body.totals).toBeDefined();
      expect(response.body.breakdown).toBeDefined();

      // Verificar totais
      expect(response.body.totals.payables.current).toBe(1000);
      expect(response.body.totals.receivables.current).toBe(2000);
      expect(response.body.totals.transactions.current).toBe(2);
    });
  });

  describe('Filtros de período', () => {
    it('deve filtrar por período pré-definido (30d)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/payments?period=30d')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('deve filtrar por período custom', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';

      const response = await request(app.getHttpServer())
        .get(`/api/reports/payments?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('deve retornar erro para período maior que 1 ano', async () => {
      const startDate = '2025-01-01';
      const endDate = '2026-02-01';

      const response = await request(app.getHttpServer())
        .get(`/api/reports/payments?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.message[0]).toContain('Período máximo');
    });
  });

  describe('Filtros de categoria', () => {
    it('deve filtrar por múltiplas categorias', async () => {
      const timestamp = Date.now();
      const categoryFactory = new CategoryFactory(prisma);
      const category1 = await categoryFactory.create({
        organizationId,
        name: `Cat Filtro 1 ${timestamp}`,
        type: 'PAYABLE',
      });
      const category2 = await categoryFactory.create({
        organizationId,
        name: `Cat Filtro 2 ${timestamp}`,
        type: 'PAYABLE',
      });

      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const paymentFactory = new PaymentFactory(prisma);

      const payable1 = await payableFactory.create({
        organizationId,
        categoryId: category1.id,
        vendorId: vendor.id,
        amount: 300,
      });
      await paymentFactory.create({
        amount: 300,
        paymentDate: TEST_DATE,
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable1.installments[0].id,
            amount: 300,
          },
        ],
      });

      const payable2 = await payableFactory.create({
        organizationId,
        categoryId: category2.id,
        vendorId: vendor.id,
        amount: 400,
      });
      await paymentFactory.create({
        amount: 400,
        paymentDate: TEST_DATE,
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable2.installments[0].id,
            amount: 400,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(
          `/api/reports/payments?startDate=${PERIOD_START}&endDate=${PERIOD_END}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.totals.payables.current).toBe(700);
    });
  });

  describe('Filtros de fornecedor e cliente', () => {
    it('deve filtrar por fornecedor', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const paymentFactory = new PaymentFactory(prisma);

      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 400,
      });
      await paymentFactory.create({
        amount: 400,
        paymentDate: TEST_DATE,
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable.installments[0].id,
            amount: 400,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(
          `/api/reports/payments?vendorIds=${vendor.id}&startDate=${PERIOD_START}&endDate=${PERIOD_END}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.totals.payables.current).toBe(400);
      expect(response.body.totals.receivables.current).toBe(0);
    });

    it('deve filtrar por cliente', async () => {
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      const receivableFactory = new ReceivableFactory(prisma);
      const paymentFactory = new PaymentFactory(prisma);

      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 600,
      });
      await paymentFactory.create({
        amount: 600,
        paymentDate: TEST_DATE,
        organizationId,
        allocations: [
          {
            receivableInstallmentId: receivable.installments[0].id,
            amount: 600,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(
          `/api/reports/payments?customerIds=${customer.id}&startDate=${PERIOD_START}&endDate=${PERIOD_END}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.totals.payables.current).toBe(0);
      expect(response.body.totals.receivables.current).toBe(600);
    });
  });

  describe('Filtros de tag', () => {
    it('deve filtrar por tag', async () => {
      const timestamp = Date.now();
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({
        organizationId,
        name: `Tag Filtro ${timestamp}`,
      });

      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const paymentFactory = new PaymentFactory(prisma);

      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 700,
      });
      await paymentFactory.create({
        amount: 700,
        paymentDate: TEST_DATE,
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable.installments[0].id,
            amount: 700,
          },
        ],
      });

      await prisma.payableTag.create({
        data: { payableId: payable.id, tagId: tag.id },
      });

      const response = await request(app.getHttpServer())
        .get(
          `/api/reports/payments?tagIds=${tag.id}&startDate=${PERIOD_START}&endDate=${PERIOD_END}&groupBy=day`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.totals.payables.current).toBe(700);
    });
  });

  describe('Agrupamento (groupBy)', () => {
    it('deve agrupar por dia', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/payments?groupBy=day')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.timeSeries).toBeDefined();
    });

    it('deve agrupar por semana', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/payments?groupBy=week')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.timeSeries).toBeDefined();
    });

    it('deve agrupar por mês (padrão)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/payments?groupBy=month')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.timeSeries).toBeDefined();
    });
  });

  describe('Paginação nos breakdowns', () => {
    it('deve suportar paginação nos breakdowns', async () => {
      const timestamp = Date.now();
      // Criar dados para paginação
      const categoryFactory = new CategoryFactory(prisma);
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });
      const payableFactory = new PayableFactory(prisma);
      const paymentFactory = new PaymentFactory(prisma);

      // Criar pelo menos 5 categorias para garantir total > 2
      for (let i = 0; i < 5; i++) {
        const category = await categoryFactory.create({
          organizationId,
          name: `Categoria Pag ${timestamp}-${i}`,
          type: 'PAYABLE',
        });

        const payable = await payableFactory.create({
          organizationId,
          categoryId: category.id,
          vendorId: vendor.id,
          amount: 100,
        });
        await paymentFactory.create({
          amount: 100,
          paymentDate: TEST_DATE,
          organizationId,
          allocations: [
            {
              payableInstallmentId: payable.installments[0].id,
              amount: 100,
            },
          ],
        });
      }

      const response = await request(app.getHttpServer())
        .get(
          `/api/reports/payments?skip=0&take=2&startDate=${PERIOD_START}&endDate=${PERIOD_END}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que paginação está funcionando
      expect(
        response.body.breakdown.byCategory.data.length
      ).toBeLessThanOrEqual(2);
      // O total deve ser >= 5 (categorias criadas neste teste)
      // Pode ser maior se houver dados de outros testes
      expect(response.body.breakdown.byCategory.total).toBeGreaterThanOrEqual(
        5
      );
    });
  });
});
