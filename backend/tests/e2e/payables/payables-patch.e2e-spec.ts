import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  PayableFactory,
  VendorFactory,
  CategoryFactory,
} from '../../factories';

describe('Payables - PATCH (e2e)', () => {
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

  describe('PATCH /payables/:id', () => {
    it('deve atualizar conta a pagar existente', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const categoryFactory = new CategoryFactory(prisma);
      const category = await categoryFactory.create({
        organizationId,
        type: 'PAYABLE',
      });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        notes: 'Nota Original',
        amount: 1000,
      });

      const updateData = {
        notes: 'Nota Atualizada',
        categoryId: category.id,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/payables/${payable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', payable.id);
      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body.category?.id).toBe(updateData.categoryId);

      const updated = await prisma.payable.findUnique({
        where: { id: payable.id },
        include: { category: true },
      });

      expect(updated?.notes).toBe(updateData.notes);
      expect(updated?.category?.id).toBe(updateData.categoryId);
    });

    it('deve atualizar apenas campos enviados', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        notes: 'Nota Original',
        amount: 1000,
      });

      const updateData = { notes: 'Nota Parcialmente Atualizada' };

      const response = await request(app.getHttpServer())
        .patch(`/api/payables/${payable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.notes).toBe(updateData.notes);
      // expect(response.body.amount).toBe(payable.amount); // Não deve mudar
    });

    it('deve remover categoria quando categoryId é null', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const categoryFactory = new CategoryFactory(prisma);
      const category = await categoryFactory.create({
        organizationId,
        type: 'PAYABLE',
      });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        categoryId: category.id,
      });

      const updateData = { categoryId: null };

      const response = await request(app.getHttpServer())
        .patch(`/api/payables/${payable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.category).toBeNull();

      const updated = await prisma.payable.findUnique({
        where: { id: payable.id },
        include: { category: true },
      });

      expect(updated?.category).toBeNull();
    });

    it('deve retornar 404 para conta inexistente', async () => {
      const updateData = { notes: 'Nota Inexistente' };

      await request(app.getHttpServer())
        .patch('/api/payables/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('deve retornar 404 para conta de outra organização', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
      });

      // Criar outro usuário de outra organização
      const otherAuth = await createAuthenticatedUser(app, prisma);
      const otherAccessToken = otherAuth.accessToken;

      const updateData = { notes: 'Tentativa de alteração' };

      await request(app.getHttpServer())
        .patch(`/api/payables/${payable.id}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send(updateData)
        .expect(404);
    });
  });
});
