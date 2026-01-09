import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { ReceivableFactory, CustomerFactory } from '../../factories';

describe('Receivables Installments - PATCH (e2e)', () => {
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

  describe('PATCH /receivables/:id/installments/:installmentId', () => {
    describe('Atualização de Valor', () => {
      it('deve atualizar o valor de uma parcela pendente', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(3, {
          organizationId,
          customerId: customer.id,
          amount: 3000, // 3 parcelas de 1000 cada
        });

        const installmentToUpdate = receivable.installments[0];
        const newAmount = 1500;

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installmentToUpdate.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: newAmount })
          .expect(200);

        expect(response.body.installments).toHaveLength(3);

        // Verificar que a parcela foi atualizada
        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installmentToUpdate.id
        );
        expect(updatedInstallment.amount).toBe(newAmount);

        // Verificar que o total foi recalculado (1500 + 1000 + 1000 = 3500)
        expect(response.body.amount).toBe(3500);
      });

      it('deve recalcular o total da conta ao atualizar valor de parcela', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(2, {
          organizationId,
          customerId: customer.id,
          amount: 2000, // 2 parcelas de 1000 cada
        });

        const installment1 = receivable.installments[0];
        const installment2 = receivable.installments[1];

        // Atualizar primeira parcela para 800
        await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installment1.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 800 })
          .expect(200);

        // Atualizar segunda parcela para 1200
        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installment2.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1200 })
          .expect(200);

        // Total deve ser 800 + 1200 = 2000
        expect(response.body.amount).toBe(2000);
      });

      it('deve retornar erro ao tentar atualizar parcela com recebimentos', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(2, {
          organizationId,
          customerId: customer.id,
          amount: 2000,
        });

        const installment = receivable.installments[0];

        // Criar recebimento para a parcela
        await prisma.payment.create({
          data: {
            organizationId,
            amount: 500,
            paymentDate: new Date(),
            paymentMethod: 'PIX',
            allocations: {
              create: {
                amount: 500,
                receivableInstallmentId: installment.id,
              },
            },
          },
        });

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installment.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1500 })
          .expect(400);

        expect(response.body.message).toContain('pagamentos registrados');
      });

      it('deve retornar erro ao tentar atualizar parcela não pendente', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(2, {
          organizationId,
          customerId: customer.id,
          amount: 2000,
        });

        const installment = receivable.installments[0];

        // Marcar parcela como paga
        await prisma.receivableInstallment.update({
          where: { id: installment.id },
          data: { status: 'PAID', receivedAmount: installment.amount },
        });

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installment.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1500 })
          .expect(400);

        expect(response.body.message).toContain('parcelas pendentes');
      });
    });

    describe('Atualização de Data de Vencimento', () => {
      it('deve atualizar a data de vencimento de uma parcela', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(3, {
          organizationId,
          customerId: customer.id,
          amount: 3000,
        });

        const installmentToUpdate = receivable.installments[1]; // Segunda parcela
        const newDueDate = '2026-03-15';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installmentToUpdate.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ dueDate: newDueDate })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installmentToUpdate.id
        );

        expect(updatedInstallment.dueDate).toContain(newDueDate);
      });

      it('deve reordenar parcelas ao alterar data de vencimento', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(3, {
          organizationId,
          customerId: customer.id,
          amount: 3000,
        });

        // Parcelas originais:
        // Parcela 1: 2026-01-15
        // Parcela 2: 2026-02-15
        // Parcela 3: 2026-03-15

        const thirdInstallment = receivable.installments[2];

        // Mudar a terceira parcela para vencer antes da primeira
        const newDueDate = '2026-01-01';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${thirdInstallment.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ dueDate: newDueDate })
          .expect(200);

        expect(response.body.installments).toHaveLength(3);

        // Verificar que as parcelas foram reordenadas
        const installments = response.body.installments;

        // A parcela que era a terceira agora deve ser a primeira
        expect(installments[0].id).toBe(thirdInstallment.id);
        expect(installments[0].installmentNumber).toBe(1);
        expect(installments[0].dueDate).toContain(newDueDate);

        // As outras devem ter sido renumeradas
        expect(installments[1].installmentNumber).toBe(2);
        expect(installments[2].installmentNumber).toBe(3);

        // Verificar ordem cronológica
        const date1 = new Date(installments[0].dueDate);
        const date2 = new Date(installments[1].dueDate);
        const date3 = new Date(installments[2].dueDate);

        expect(date1.getTime()).toBeLessThan(date2.getTime());
        expect(date2.getTime()).toBeLessThan(date3.getTime());
      });

      it('deve reordenar corretamente ao mover parcela do meio para o final', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        // Criar com data inicial em janeiro de 2026 para ter controle das datas
        const receivable = await receivableFactory.createWithInstallments(3, {
          organizationId,
          customerId: customer.id,
          amount: 3000,
          dueDate: new Date('2026-01-15'),
        });

        const secondInstallment = receivable.installments[1];

        // Mover a segunda parcela (fev/26) para depois da terceira (mar/26)
        const newDueDate = '2026-04-15';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${secondInstallment.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ dueDate: newDueDate })
          .expect(200);

        const installments = response.body.installments;

        // Verificar que a parcela foi movida e está na ordem correta
        // Como movemos a segunda parcela para 04-15, e as outras são 01-15 e 03-15,
        // a ordem deve ser: 01-15, 03-15, 04-15
        const movedInstallment = installments.find(
          (inst: any) => inst.id === secondInstallment.id
        );

        // Deve estar na última posição (parcela 3)
        expect(movedInstallment.installmentNumber).toBe(3);
        expect(movedInstallment.dueDate).toContain(newDueDate);

        // Verificar ordem cronológica
        for (let i = 0; i < installments.length - 1; i++) {
          const current = new Date(installments[i].dueDate);
          const next = new Date(installments[i + 1].dueDate);
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      });

      it('deve retornar erro para data inválida', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(2, {
          organizationId,
          customerId: customer.id,
          amount: 2000,
        });

        const installment = receivable.installments[0];

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installment.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ dueDate: 'data-invalida' })
          .expect(400);

        expect(response.body.message).toContain('Data de vencimento inválida');
      });

      it('deve aceitar requisição sem campo dueDate', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(2, {
          organizationId,
          customerId: customer.id,
          amount: 2000,
        });

        const installment = receivable.installments[0];
        const originalDueDate = installment.dueDate;

        // Enviar apenas amount, sem dueDate
        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installment.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1200 })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        // Data não deve ter mudado
        expect(updatedInstallment.dueDate).toContain(
          new Date(originalDueDate).toISOString().split('T')[0]
        );

        // Mas o valor deve ter mudado
        expect(updatedInstallment.amount).toBe(1200);
      });
    });

    describe('Atualização Combinada', () => {
      it('deve atualizar valor e data simultaneamente com reordenação', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(3, {
          organizationId,
          customerId: customer.id,
          amount: 3000,
        });

        const thirdInstallment = receivable.installments[2];

        const newAmount = 1500;
        const newDueDate = '2026-01-01';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${thirdInstallment.id}`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: newAmount, dueDate: newDueDate })
          .expect(200);

        const installments = response.body.installments;

        // Verificar que foi reordenada para primeira posição
        expect(installments[0].id).toBe(thirdInstallment.id);
        expect(installments[0].installmentNumber).toBe(1);
        expect(installments[0].amount).toBe(newAmount);
        expect(installments[0].dueDate).toContain(newDueDate);

        // Verificar que o total foi recalculado (1500 + 1000 + 1000 = 3500)
        expect(response.body.amount).toBe(3500);
      });
    });

    describe('Validações de Segurança', () => {
      it('deve retornar 404 para parcela inexistente', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.create({
          organizationId,
          customerId: customer.id,
        });

        await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/00000000-0000-0000-0000-000000000000`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1000 })
          .expect(404);
      });

      it('deve retornar 404 para conta de outra organização', async () => {
        const customerFactory = new CustomerFactory(prisma);
        const customer = await customerFactory.create({ organizationId });

        const receivableFactory = new ReceivableFactory(prisma);
        const receivable = await receivableFactory.createWithInstallments(2, {
          organizationId,
          customerId: customer.id,
          amount: 2000,
        });

        // Criar outro usuário de outra organização
        const otherAuth = await createAuthenticatedUser(app, prisma);
        const otherAccessToken = otherAuth.accessToken;

        const installment = receivable.installments[0];

        await request(app.getHttpServer())
          .patch(
            `/api/receivables/${receivable.id}/installments/${installment.id}`
          )
          .set('Authorization', `Bearer ${otherAccessToken}`)
          .send({ amount: 1500 })
          .expect(404);
      });
    });
  });
});
