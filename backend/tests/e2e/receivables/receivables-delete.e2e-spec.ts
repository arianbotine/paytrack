import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { ReceivableFactory } from '../../factories/receivable.factory';
import { PaymentFactory } from '../../factories/payment.factory';
import { CustomerFactory } from '../../factories/customer.factory';

describe('Receivables - DELETE (e2e)', () => {
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

  describe('DELETE /receivables/:id', () => {
    it('deve remover conta a receber e payments órfãos vinculados às parcelas', async () => {
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      const receivableFactory = new ReceivableFactory(prisma);
      const receivable = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
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
            receivableInstallmentId: receivable.installments[0].id,
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
            receivableInstallmentId: receivable.installments[0].id,
            amount: 500,
          },
          {
            receivableInstallmentId: receivable.installments[1].id,
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

      // Excluir conta a receber
      await request(app.getHttpServer())
        .delete(`/api/receivables/${receivable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que a conta foi removida
      const receivableAfterDelete = await prisma.receivable.findUnique({
        where: { id: receivable.id },
      });
      expect(receivableAfterDelete).toBeNull();

      // Verificar que parcelas foram removidas
      const installmentsAfterDelete =
        await prisma.receivableInstallment.findMany({
          where: { receivableId: receivable.id },
        });
      expect(installmentsAfterDelete).toHaveLength(0);

      // Verificar que allocations foram removidas
      const allocationsAfterDelete = await prisma.paymentAllocation.findMany({
        where: {
          OR: [
            { receivableInstallmentId: receivable.installments[0].id },
            { receivableInstallmentId: receivable.installments[1].id },
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

    it('deve remover conta a receber mas manter payments com allocations em outras contas', async () => {
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({ organizationId });

      const receivableFactory = new ReceivableFactory(prisma);

      // Criar primeira conta
      const receivable1 = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
        amount: 500,
      });

      // Criar segunda conta
      const receivable2 = await receivableFactory.create({
        organizationId,
        customerId: customer.id,
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
            receivableInstallmentId: receivable1.installments[0].id,
            amount: 500,
          },
          {
            receivableInstallmentId: receivable2.installments[0].id,
            amount: 500,
          },
        ],
      });

      // Excluir apenas a primeira conta
      await request(app.getHttpServer())
        .delete(`/api/receivables/${receivable1.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que primeira conta foi removida
      const receivable1AfterDelete = await prisma.receivable.findUnique({
        where: { id: receivable1.id },
      });
      expect(receivable1AfterDelete).toBeNull();

      // Verificar que segunda conta ainda existe
      const receivable2AfterDelete = await prisma.receivable.findUnique({
        where: { id: receivable2.id },
      });
      expect(receivable2AfterDelete).not.toBeNull();

      // Verificar que payment ainda existe (ainda tem allocation para receivable2)
      const sharedPaymentAfterDelete = await prisma.payment.findUnique({
        where: { id: sharedPayment.id },
      });
      expect(sharedPaymentAfterDelete).not.toBeNull();

      // Verificar que apenas uma allocation foi removida
      const remainingAllocations = await prisma.paymentAllocation.findMany({
        where: { paymentId: sharedPayment.id },
      });
      expect(remainingAllocations).toHaveLength(1);
      expect(remainingAllocations[0].receivableInstallmentId).toBe(
        receivable2.installments[0].id
      );
    });

    it('deve retornar 404 para conta a receber inexistente', () => {
      return request(app.getHttpServer())
        .delete('/api/receivables/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('não deve permitir remover conta a receber de outra organização', async () => {
      // Criar conta em outra organização
      const org2 = await createAuthenticatedUser(app, prisma);
      const customerFactory = new CustomerFactory(prisma);
      const customer = await customerFactory.create({
        organizationId: org2.organizationId,
      });

      const receivableFactory = new ReceivableFactory(prisma);
      const receivable = await receivableFactory.create({
        organizationId: org2.organizationId,
        customerId: customer.id,
        amount: 500,
      });

      return request(app.getHttpServer())
        .delete(`/api/receivables/${receivable.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
