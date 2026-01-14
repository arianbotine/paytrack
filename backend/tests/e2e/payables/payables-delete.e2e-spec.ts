import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { PayableFactory } from '../../factories/payable.factory';
import { PaymentFactory } from '../../factories/payment.factory';
import { VendorFactory } from '../../factories/vendor.factory';

describe('Payables - DELETE (e2e)', () => {
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

    const auth = await createAuthenticatedUser(app, prisma, {
      role: 'OWNER',
    });
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('DELETE /payables/:id', () => {
    it('deve remover conta a pagar e payments órfãos vinculados às parcelas', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 1000,
        installmentCount: 2,
      });

      const paymentFactory = new PaymentFactory(prisma);

      // Criar payment que paga apenas uma parcela (payment ficará órfão após exclusão)
      const partialPayment = await paymentFactory.create({
        amount: 500,
        paymentDate: new Date(),
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable.installments[0].id,
            amount: 500,
          },
        ],
      });

      // Criar payment que paga ambas as parcelas (payment NÃO ficará órfão)
      const fullPayment = await paymentFactory.create({
        amount: 1000,
        paymentDate: new Date(),
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable.installments[0].id,
            amount: 500,
          },
          {
            payableInstallmentId: payable.installments[1].id,
            amount: 500,
          },
        ],
      });

      // Verificar que payments existem antes da exclusão
      const paymentBeforeDelete = await prisma.payment.findUnique({
        where: { id: partialPayment.id },
      });
      expect(paymentBeforeDelete).not.toBeNull();

      const fullPaymentBeforeDelete = await prisma.payment.findUnique({
        where: { id: fullPayment.id },
      });
      expect(fullPaymentBeforeDelete).not.toBeNull();

      // Excluir conta a pagar
      await request(app.getHttpServer())
        .delete(`/api/payables/${payable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que a conta foi removida
      const payableAfterDelete = await prisma.payable.findUnique({
        where: { id: payable.id },
      });
      expect(payableAfterDelete).toBeNull();

      // Verificar que parcelas foram removidas
      const installmentsAfterDelete = await prisma.payableInstallment.findMany({
        where: { payableId: payable.id },
      });
      expect(installmentsAfterDelete).toHaveLength(0);

      // Verificar que allocations foram removidas
      const allocationsAfterDelete = await prisma.paymentAllocation.findMany({
        where: {
          OR: [
            { payableInstallmentId: payable.installments[0].id },
            { payableInstallmentId: payable.installments[1].id },
          ],
        },
      });
      expect(allocationsAfterDelete).toHaveLength(0);

      // Verificar que payment parcial (órfão) foi removido
      const partialPaymentAfterDelete = await prisma.payment.findUnique({
        where: { id: partialPayment.id },
      });
      expect(partialPaymentAfterDelete).toBeNull();

      // Verificar que payment completo TAMBÉM foi removido (todas allocations eram para a conta excluída)
      const fullPaymentAfterDelete = await prisma.payment.findUnique({
        where: { id: fullPayment.id },
      });
      expect(fullPaymentAfterDelete).toBeNull();
    });

    it('deve remover conta a pagar mas manter payments com allocations em outras contas', async () => {
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({ organizationId });

      const payableFactory = new PayableFactory(prisma);

      // Criar primeira conta
      const payable1 = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 500,
      });

      // Criar segunda conta
      const payable2 = await payableFactory.create({
        organizationId,
        vendorId: vendor.id,
        amount: 500,
      });

      const paymentFactory = new PaymentFactory(prisma);

      // Criar payment que paga ambas as contas
      const sharedPayment = await paymentFactory.create({
        amount: 1000,
        paymentDate: new Date(),
        organizationId,
        allocations: [
          {
            payableInstallmentId: payable1.installments[0].id,
            amount: 500,
          },
          {
            payableInstallmentId: payable2.installments[0].id,
            amount: 500,
          },
        ],
      });

      // Excluir apenas a primeira conta
      await request(app.getHttpServer())
        .delete(`/api/payables/${payable1.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que primeira conta foi removida
      const payable1AfterDelete = await prisma.payable.findUnique({
        where: { id: payable1.id },
      });
      expect(payable1AfterDelete).toBeNull();

      // Verificar que segunda conta ainda existe
      const payable2AfterDelete = await prisma.payable.findUnique({
        where: { id: payable2.id },
      });
      expect(payable2AfterDelete).not.toBeNull();

      // Verificar que payment ainda existe (ainda tem allocation para payable2)
      const sharedPaymentAfterDelete = await prisma.payment.findUnique({
        where: { id: sharedPayment.id },
      });
      expect(sharedPaymentAfterDelete).not.toBeNull();

      // Verificar que apenas uma allocation foi removida
      const remainingAllocations = await prisma.paymentAllocation.findMany({
        where: { paymentId: sharedPayment.id },
      });
      expect(remainingAllocations).toHaveLength(1);
      expect(remainingAllocations[0].payableInstallmentId).toBe(
        payable2.installments[0].id
      );
    });

    it('deve retornar 404 para conta a pagar inexistente', () => {
      return request(app.getHttpServer())
        .delete('/api/payables/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('não deve permitir remover conta a pagar de outra organização', async () => {
      // Criar conta em outra organização
      const org2 = await createAuthenticatedUser(app, prisma);
      const vendorFactory = new VendorFactory(prisma);
      const vendor = await vendorFactory.create({
        organizationId: org2.organizationId,
      });

      const payableFactory = new PayableFactory(prisma);
      const payable = await payableFactory.create({
        organizationId: org2.organizationId,
        vendorId: vendor.id,
        amount: 500,
      });

      return request(app.getHttpServer())
        .delete(`/api/payables/${payable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
