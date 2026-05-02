import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { PayableFactory, VendorFactory, TagFactory } from '../../factories';

describe('Payables Installment Items (e2e)', () => {
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

  describe('GET /payables/:payableId/installments/:installmentId/items', () => {
    it('deve retornar lista vazia e resumo quando não há itens', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(1, {
        organizationId,
        vendorId: vendor.id,
        amount: 1000,
      });

      const installment = payable.installments[0];

      const response = await request(app.getHttpServer())
        .get(`/api/payables/${payable.id}/installments/${installment.id}/items`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.summary.installmentAmount).toBe(1000);
      expect(response.body.summary.itemsTotal).toBe(0);
      expect(response.body.summary.remainingAmountForItems).toBe(1000);
    });
  });

  describe('POST /payables/:payableId/installments/:installmentId/items', () => {
    it('deve criar item com tags e atualizar resumo', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const tagFactory = new TagFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });
      const tag1 = await tagFactory.create({ organizationId, name: 'Festa' });
      const tag2 = await tagFactory.create({ organizationId, name: 'Buffet' });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(1, {
        organizationId,
        vendorId: vendor.id,
        amount: 1200,
      });

      const installment = payable.installments[0];

      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${installment.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Bolo e doces',
          amount: 300,
          tagIds: [tag1.id, tag2.id],
        })
        .expect(201);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Bolo e doces');
      expect(response.body.data[0].amount).toBe(300);
      expect(response.body.data[0].tags).toHaveLength(2);
      expect(response.body.summary.itemsTotal).toBe(300);
      expect(response.body.summary.remainingAmountForItems).toBe(900);
    });

    it('deve bloquear criação quando soma dos itens exceder valor da parcela', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(1, {
        organizationId,
        vendorId: vendor.id,
        amount: 500,
      });

      const installment = payable.installments[0];

      await prisma.payableInstallmentItem.create({
        data: {
          organizationId,
          payableInstallmentId: installment.id,
          description: 'Primeiro item',
          amount: 400,
          sortOrder: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${installment.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item excedente',
          amount: 150,
        })
        .expect(400);

      expect(response.body.message).toContain(
        'A soma dos itens da parcela não pode ser maior que o valor da parcela'
      );
    });

    it('deve retornar 400 ao enviar tag de outra organização', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(1, {
        organizationId,
        vendorId: vendor.id,
        amount: 1000,
      });

      const installment = payable.installments[0];

      const otherAuth = await createAuthenticatedUser(app, prisma);
      const tagFactory = new TagFactory(prisma);
      const otherOrgTag = await tagFactory.create({
        organizationId: otherAuth.organizationId,
        name: 'Tag Outra Org',
      });

      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${installment.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item com tag inválida',
          amount: 100,
          tagIds: [otherOrgTag.id],
        })
        .expect(400);

      expect(response.body.message).toContain('tags informadas são inválidas');
    });
  });

  describe('PATCH /payables/:payableId/installments/:installmentId/items/:itemId', () => {
    it('deve atualizar item e manter regra de teto da parcela', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const tagFactory = new TagFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });
      const tag = await tagFactory.create({
        organizationId,
        name: 'Decoração',
      });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(1, {
        organizationId,
        vendorId: vendor.id,
        amount: 600,
      });

      const installment = payable.installments[0];

      const item1 = await prisma.payableInstallmentItem.create({
        data: {
          organizationId,
          payableInstallmentId: installment.id,
          description: 'Item 1',
          amount: 200,
          sortOrder: 1,
        },
      });

      await prisma.payableInstallmentItem.create({
        data: {
          organizationId,
          payableInstallmentId: installment.id,
          description: 'Item 2',
          amount: 150,
          sortOrder: 2,
        },
      });

      const okResponse = await request(app.getHttpServer())
        .patch(
          `/api/payables/${payable.id}/installments/${installment.id}/items/${item1.id}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item 1 atualizado',
          amount: 300,
          tagIds: [tag.id],
        })
        .expect(200);

      expect(okResponse.body.summary.itemsTotal).toBe(450);

      const blockResponse = await request(app.getHttpServer())
        .patch(
          `/api/payables/${payable.id}/installments/${installment.id}/items/${item1.id}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 500,
        })
        .expect(400);

      expect(blockResponse.body.message).toContain(
        'A soma dos itens da parcela não pode ser maior que o valor da parcela'
      );
    });
  });

  describe('DELETE /payables/:payableId/installments/:installmentId/items/:itemId', () => {
    it('deve excluir item da parcela', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(1, {
        organizationId,
        vendorId: vendor.id,
        amount: 700,
      });

      const installment = payable.installments[0];

      const item = await prisma.payableInstallmentItem.create({
        data: {
          organizationId,
          payableInstallmentId: installment.id,
          description: 'Item removível',
          amount: 200,
          sortOrder: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(
          `/api/payables/${payable.id}/installments/${installment.id}/items/${item.id}`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.summary.itemsTotal).toBe(0);
      expect(response.body.summary.remainingAmountForItems).toBe(700);
    });

    it('deve retornar 404 ao acessar parcela de outra organização', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(1, {
        organizationId,
        vendorId: vendor.id,
        amount: 700,
      });

      const installment = payable.installments[0];

      const item = await prisma.payableInstallmentItem.create({
        data: {
          organizationId,
          payableInstallmentId: installment.id,
          description: 'Item privado',
          amount: 100,
          sortOrder: 1,
        },
      });

      const otherAuth = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .delete(
          `/api/payables/${payable.id}/installments/${installment.id}/items/${item.id}`
        )
        .set('Authorization', `Bearer ${otherAuth.accessToken}`)
        .expect(404);
    });
  });
});
