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

    it('deve criar itens em múltiplas parcelas com splitCount=3', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const tagFactory = new TagFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });
      const tag = await tagFactory.create({ organizationId, name: 'Split' });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(5, {
        organizationId,
        vendorId: vendor.id,
        amount: 300,
      });

      // parcela 1 tem valor 60 (300/5), splitCount=3 distribui 30+15+15? No.
      // amount=150 / 3 = 50 each; remainder to first → 50+50+50
      const installment = payable.installments[0]; // installmentNumber=1

      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${installment.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item parcelado',
          amount: 150,
          tagIds: [tag.id],
          splitCount: 3,
        })
        .expect(201);

      // Response shows items of the CURRENT installment only
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].amount).toBe(50);

      // Verify items were created in installments 2 and 3 too
      const inst2 = payable.installments[1];
      const inst3 = payable.installments[2];

      const inst2Items = await request(app.getHttpServer())
        .get(
          `/api/payables/${payable.id}/installments/${inst2.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(inst2Items.body.data).toHaveLength(1);
      expect(inst2Items.body.data[0].amount).toBe(50);
      expect(inst2Items.body.data[0].description).toBe('Item parcelado');
      expect(inst2Items.body.data[0].tags).toHaveLength(1);

      const inst3Items = await request(app.getHttpServer())
        .get(
          `/api/payables/${payable.id}/installments/${inst3.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(inst3Items.body.data).toHaveLength(1);
      expect(inst3Items.body.data[0].amount).toBe(50);
    });

    it('deve aplicar remainder na primeira parcela ao dividir valor não-divisível', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.createWithInstallments(3, {
        organizationId,
        vendorId: vendor.id,
        amount: 300,
      });

      const installment = payable.installments[0]; // installmentNumber=1

      // 100 / 3 = 33.33 each → floor = 33.33, remainder = 100 - 33.33*2 = 33.34
      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${installment.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item indivisível',
          amount: 100,
          splitCount: 3,
        })
        .expect(201);

      // First installment (current) gets remainder: 33.34
      expect(response.body.data[0].amount).toBe(33.34);

      const inst2 = payable.installments[1];
      const inst2Items = await request(app.getHttpServer())
        .get(`/api/payables/${payable.id}/installments/${inst2.id}/items`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(inst2Items.body.data[0].amount).toBe(33.33);
    });

    it('deve retornar 400 com INSTALLMENTS_NOT_FOUND quando parcelas alvo não existem', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      // Only 2 installments; requesting splitCount=3 means installment 3 is missing
      const payable = await payableFactory.createWithInstallments(2, {
        organizationId,
        vendorId: vendor.id,
        amount: 200,
      });

      const installment = payable.installments[0]; // installmentNumber=1

      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${installment.id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item sem parcelas suficientes',
          amount: 90,
          splitCount: 3,
        })
        .expect(400);

      expect(response.body.code).toBe('INSTALLMENTS_NOT_FOUND');
      expect(response.body.missingInstallmentNumbers).toContain(3);
    });

    it('deve retornar 422 com INSTALLMENT_CAPACITY_EXCEEDED quando parcela não tem capacidade e forceAdjust=false', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      // 2 installments, each has amount=100
      const payable = await payableFactory.createWithInstallments(2, {
        organizationId,
        vendorId: vendor.id,
        amount: 200,
      });

      // Fill second installment to capacity
      await prisma.payableInstallmentItem.create({
        data: {
          organizationId,
          payableInstallmentId: payable.installments[1].id,
          description: 'Item existente',
          amount: 100,
          sortOrder: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${payable.installments[0].id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item que excede capacidade',
          amount: 100,
          splitCount: 2,
        })
        .expect(422);

      expect(response.body.code).toBe('INSTALLMENT_CAPACITY_EXCEEDED');
      expect(response.body.affectedInstallments).toHaveLength(1);
      expect(response.body.affectedInstallments[0].installmentNumber).toBe(2);
      expect(response.body.affectedInstallments[0].currentCapacity).toBe(0);
      expect(response.body.affectedInstallments[0].splitAmount).toBe(50);
      expect(response.body.affectedInstallments[0].adjustmentNeeded).toBe(50);
    });

    it('deve ajustar valor da parcela e criar item quando forceAdjustInstallmentAmount=true', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      // 2 installments, each 100
      const payable = await payableFactory.createWithInstallments(2, {
        organizationId,
        vendorId: vendor.id,
        amount: 200,
      });

      // Fill second installment fully
      await prisma.payableInstallmentItem.create({
        data: {
          organizationId,
          payableInstallmentId: payable.installments[1].id,
          description: 'Item preenchido',
          amount: 100,
          sortOrder: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .post(
          `/api/payables/${payable.id}/installments/${payable.installments[0].id}/items`
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Item forçado',
          amount: 100,
          splitCount: 2,
          forceAdjustInstallmentAmount: true,
        })
        .expect(201);

      // Current installment has item with value 50
      expect(response.body.data[0].amount).toBe(50);

      // Second installment amount should have been increased by 50
      const updatedInst2 = await prisma.payableInstallment.findUnique({
        where: { id: payable.installments[1].id },
        select: { amount: true },
      });
      expect(Number(updatedInst2!.amount)).toBe(150);
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
