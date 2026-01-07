import { Injectable } from '@nestjs/common';
import { ReceivablesRepository } from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';

/**
 * Use Case: Obter Pagamentos de Receivable
 * Responsabilidade: Buscar histórico de pagamentos de uma conta a receber
 */
@Injectable()
export class GetReceivablePaymentsUseCase {
  constructor(private readonly repository: ReceivablesRepository) {}

  async execute(receivableId: string, organizationId: string) {
    const payments = await this.repository.transaction(async prisma => {
      return prisma.payment.findMany({
        where: {
          organizationId,
          allocations: {
            some: {
              receivableInstallment: {
                receivableId,
              },
            },
          },
        },
        include: {
          allocations: {
            where: {
              receivableInstallment: {
                receivableId,
              },
            },
            include: {
              receivableInstallment: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
      });
    });

    return payments.map(payment => ({
      id: payment.id,
      amount: MoneyUtils.toNumber(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      allocations: payment.allocations.map(allocation => ({
        id: allocation.id,
        amount: MoneyUtils.toNumber(allocation.amount),
        installmentNumber: allocation.receivableInstallment?.installmentNumber,
        installmentId: allocation.receivableInstallment?.id,
      })),
    }));
  }
}
