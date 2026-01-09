import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  ReceivableFactory,
  CustomerFactory,
  CategoryFactory,
} from '../../factories';

describe('Receivables - PATCH (e2e)', () => {
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

  describe('PATCH /receivables/:id', () => {
    it('deve atualizar conta a receber existente', async () => {
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      const categoryFactory = new CategoryFactory(prisma);
      const category = await categoryFactory.create({
        organizationId,
        type: 'RECEIVABLE',
      });

      const receivableFactory = new ReceivableFactory(prisma);
      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        notes: 'Nota Original',
        amount: 1000,
      });

      const updateData = {
        notes: 'Nota Atualizada',
        categoryId: category.id,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/receivables/${receivable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', receivable.id);
      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body.category?.id).toBe(updateData.categoryId);

      const updated = await prisma.receivable.findUnique({
        where: { id: receivable.id },
        include: { category: true },
      });

      expect(updated?.notes).toBe(updateData.notes);
      expect(updated?.category?.id).toBe(updateData.categoryId);
    });

    it('deve atualizar apenas campos enviados', async () => {
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      const receivableFactory = new ReceivableFactory(prisma);
      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        notes: 'Nota Original',
        amount: 1000,
      });

      const updateData = { notes: 'Nota Parcialmente Atualizada' };

      const response = await request(app.getHttpServer())
        .patch(`/api/receivables/${receivable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.notes).toBe(updateData.notes);
      // expect(response.body.amount).toBe(receivable.amount); // Não deve mudar
    });

    it('deve remover categoria quando categoryId é null', async () => {
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      const categoryFactory = new CategoryFactory(prisma);
      const category = await categoryFactory.create({
        organizationId,
        type: 'RECEIVABLE',
      });

      const receivableFactory = new ReceivableFactory(prisma);
      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        categoryId: category.id,
      });

      const updateData = { categoryId: null };

      const response = await request(app.getHttpServer())
        .patch(`/api/receivables/${receivable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.category).toBeNull();

      const updated = await prisma.receivable.findUnique({
        where: { id: receivable.id },
        include: { category: true },
      });

      expect(updated?.category).toBeNull();
    });

    it('deve retornar 404 para conta inexistente', async () => {
      const updateData = { notes: 'Nota Inexistente' };

      await request(app.getHttpServer())
        .patch('/api/receivables/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('deve retornar 404 para conta de outra organização', async () => {
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      const receivableFactory = new ReceivableFactory(prisma);
      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
      });

      // Criar outro usuário de outra organização
      const otherAuth = await createAuthenticatedUser(app, prisma);
      const otherAccessToken = otherAuth.accessToken;

      const updateData = { notes: 'Tentativa de alteração' };

      await request(app.getHttpServer())
        .patch(`/api/receivables/${receivable.id}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send(updateData)
        .expect(404);
    });
  });
});
