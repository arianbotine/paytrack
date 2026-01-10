import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { PayableFactory, VendorFactory, TagFactory } from '../../factories';

describe('Payables Installments - PATCH (e2e)', () => {
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

  describe('PATCH /payables/:id/installments/:installmentId', () => {
    describe('Atualização de Valor', () => {
      it('deve atualizar o valor de uma parcela pendente', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(3, {
          organizationId,
          vendorId: vendor.id,
          amount: 3000, // 3 parcelas de 1000 cada
        });

        const installmentToUpdate = payable.installments[0];
        const newAmount = 1500;

        const response = await request(app.getHttpServer())
          .patch(
            `/api/payables/${payable.id}/installments/${installmentToUpdate.id}`
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
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000, // 2 parcelas de 1000 cada
        });

        const installment1 = payable.installments[0];
        const installment2 = payable.installments[1];

        // Atualizar primeira parcela para 800
        await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment1.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 800 })
          .expect(200);

        // Atualizar segunda parcela para 1200
        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment2.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1200 })
          .expect(200);

        // Total deve ser 800 + 1200 = 2000
        expect(response.body.amount).toBe(2000);
      });

      it('deve retornar erro ao tentar atualizar parcela com pagamentos', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        // Criar pagamento para a parcela
        await prisma.payment.create({
          data: {
            organizationId,
            amount: 500,
            paymentDate: new Date(),
            paymentMethod: 'PIX',
            allocations: {
              create: {
                amount: 500,
                payableInstallmentId: installment.id,
              },
            },
          },
        });

        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1500 })
          .expect(400);

        expect(response.body.message).toContain('pagamentos registrados');
      });

      it('deve retornar erro ao tentar atualizar parcela não pendente', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        // Marcar parcela como paga
        await prisma.payableInstallment.update({
          where: { id: installment.id },
          data: { status: 'PAID', paidAmount: installment.amount },
        });

        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1500 })
          .expect(400);

        expect(response.body.message).toContain('parcelas pendentes');
      });
    });

    describe('Atualização de Data de Vencimento', () => {
      it('deve atualizar a data de vencimento de uma parcela', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(3, {
          organizationId,
          vendorId: vendor.id,
          amount: 3000,
        });

        const installmentToUpdate = payable.installments[1]; // Segunda parcela
        const newDueDate = '2026-03-15';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/payables/${payable.id}/installments/${installmentToUpdate.id}`
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
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(3, {
          organizationId,
          vendorId: vendor.id,
          amount: 3000,
        });

        // Parcelas originais:
        // Parcela 1: 2026-01-15
        // Parcela 2: 2026-02-15
        // Parcela 3: 2026-03-15

        const thirdInstallment = payable.installments[2];

        // Mudar a terceira parcela para vencer antes da primeira
        const newDueDate = '2026-01-01';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/payables/${payable.id}/installments/${thirdInstallment.id}`
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
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        // Criar com data inicial em janeiro de 2026 para ter controle das datas
        const payable = await payableFactory.createWithInstallments(3, {
          organizationId,
          vendorId: vendor.id,
          amount: 3000,
          dueDate: new Date('2026-01-15'),
        });

        const secondInstallment = payable.installments[1];

        // Mover a segunda parcela (fev/26) para depois da terceira (mar/26)
        const newDueDate = '2026-04-15';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/payables/${payable.id}/installments/${secondInstallment.id}`
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
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ dueDate: 'data-invalida' })
          .expect(400);

        expect(response.body.message).toContain('Data de vencimento inválida');
      });

      it('deve aceitar requisição sem campo dueDate', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];
        const originalDueDate = installment.dueDate;

        // Enviar apenas amount, sem dueDate
        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
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
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(3, {
          organizationId,
          vendorId: vendor.id,
          amount: 3000,
        });

        const thirdInstallment = payable.installments[2];

        const newAmount = 1500;
        const newDueDate = '2026-01-01';

        const response = await request(app.getHttpServer())
          .patch(
            `/api/payables/${payable.id}/installments/${thirdInstallment.id}`
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

    describe('Atualização de Observações e Tags', () => {
      it('deve atualizar observações de uma parcela', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];
        const newNotes = 'Observações atualizadas para teste';

        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ notes: newNotes })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        expect(updatedInstallment.notes).toBe(newNotes);
      });

      it('deve limpar observações enviando string vazia', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        // Primeiro adicionar observações
        await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ notes: 'Observações iniciais' })
          .expect(200);

        // Depois limpar
        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ notes: '' })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        expect(updatedInstallment.notes).toBeNull();
      });

      it('deve atualizar tags de uma parcela', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const tagFactory = new TagFactory(prisma);
        const tag1 = await tagFactory.create({ organizationId });
        const tag2 = await tagFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ tagIds: [tag1.id, tag2.id] })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        expect(updatedInstallment.tags).toHaveLength(2);
        expect(updatedInstallment.tags.map((t: any) => t.tag.id)).toEqual(
          expect.arrayContaining([tag1.id, tag2.id])
        );
      });

      it('deve remover todas as tags enviando array vazio', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const tagFactory = new TagFactory(prisma);
        const tag = await tagFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        // Primeiro adicionar tag
        await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ tagIds: [tag.id] })
          .expect(200);

        // Depois remover
        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ tagIds: [] })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        expect(updatedInstallment.tags).toHaveLength(0);
      });

      it('deve permitir atualizar observações e tags em parcela paga', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const tagFactory = new TagFactory(prisma);
        const tag = await tagFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        // Marcar parcela como paga
        await prisma.payableInstallment.update({
          where: { id: installment.id },
          data: { status: 'PAID', paidAmount: installment.amount },
        });

        const newNotes = 'Observações em parcela paga';

        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ notes: newNotes, tagIds: [tag.id] })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        expect(updatedInstallment.notes).toBe(newNotes);
        expect(updatedInstallment.tags).toHaveLength(1);
        expect(updatedInstallment.tags[0].tag.id).toBe(tag.id);
      });

      it('deve permitir atualizar observações e tags em parcela com pagamentos parciais', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const tagFactory = new TagFactory(prisma);
        const tag = await tagFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];

        // Criar pagamento parcial
        await prisma.payment.create({
          data: {
            organizationId,
            amount: 500,
            paymentDate: new Date(),
            paymentMethod: 'PIX',
            allocations: {
              create: {
                amount: 500,
                payableInstallmentId: installment.id,
              },
            },
          },
        });

        const newNotes = 'Observações em parcela com pagamento parcial';

        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ notes: newNotes, tagIds: [tag.id] })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        expect(updatedInstallment.notes).toBe(newNotes);
        expect(updatedInstallment.tags).toHaveLength(1);
        expect(updatedInstallment.tags[0].tag.id).toBe(tag.id);
      });
    });

    describe('Edição Apenas de Observações/Tags com Campos Inalterados', () => {
      it('deve permitir editar apenas observações e tags em parcela paga mesmo enviando amount/dueDate inalterados', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const tagFactory = new TagFactory(prisma);
        const tag = await tagFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        const installment = payable.installments[0];
        const originalAmount = installment.amount;
        const originalDueDate = installment.dueDate;
        const originalDueDateString = originalDueDate
          .toISOString()
          .split('T')[0];

        // Marcar parcela como paga
        await prisma.payableInstallment.update({
          where: { id: installment.id },
          data: { status: 'PAID', paidAmount: installment.amount },
        });

        const newNotes = 'Observações atualizadas em parcela paga';
        const newTagIds = [tag.id];

        // Enviar amount e dueDate iguais aos originais (simulando comportamento do frontend)
        const response = await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: originalAmount,
            dueDate: originalDueDateString, // Formato YYYY-MM-DD
            notes: newNotes,
            tagIds: newTagIds,
          })
          .expect(200);

        const updatedInstallment = response.body.installments.find(
          (inst: any) => inst.id === installment.id
        );

        expect(updatedInstallment.notes).toBe(newNotes);
        expect(updatedInstallment.tags).toHaveLength(1);
        expect(updatedInstallment.tags[0].tag.id).toBe(tag.id);
        // Amount e dueDate devem permanecer inalterados
        expect(updatedInstallment.amount).toBe(Number(originalAmount));
        expect(updatedInstallment.dueDate).toContain(originalDueDateString);
      });
    });

    describe('Validações de Segurança', () => {
      it('deve retornar 404 para parcela inexistente', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.create({
          organizationId,
          vendorId: vendor.id,
        });

        await request(app.getHttpServer())
          .patch(
            `/api/payables/${payable.id}/installments/00000000-0000-0000-0000-000000000000`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 1000 })
          .expect(404);
      });

      it('deve retornar 404 para conta de outra organização', async () => {
        const vendorFactory = new VendorFactory(prisma);
        const vendor = await vendorFactory.create({ organizationId });

        const payableFactory = new PayableFactory(prisma);
        const payable = await payableFactory.createWithInstallments(2, {
          organizationId,
          vendorId: vendor.id,
          amount: 2000,
        });

        // Criar outro usuário de outra organização
        const otherAuth = await createAuthenticatedUser(app, prisma);
        const otherAccessToken = otherAuth.accessToken;

        const installment = payable.installments[0];

        await request(app.getHttpServer())
          .patch(`/api/payables/${payable.id}/installments/${installment.id}`)
          .set('Authorization', `Bearer ${otherAccessToken}`)
          .send({ amount: 1500 })
          .expect(404);
      });
    });
  });
});
