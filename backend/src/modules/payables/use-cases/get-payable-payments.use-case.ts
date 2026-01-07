import { Injectable } from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';

/**
 * Use Case: Obter Pagamentos de Payable
 * Responsabilidade: Buscar histórico de pagamentos de uma conta a pagar
 */
@Injectable()
export class GetPayablePaymentsUseCase {
  constructor(private readonly repository: PayablesRepository) {}

  async execute(payableId: string, organizationId: string) {
    const payments = await this.repository.transaction(async prisma => {
      return prisma.payment.findMany({
        where: {
          organizationId,
          allocations: {
            some: {
              payableInstallment: {
                payableId,
              },
            },
          },
        },
        include: {
          allocations: {
            where: {
              payableInstallment: {
                payableId,
              },
            },
            include: {
              payableInstallment: true,
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
        installmentNumber:
          allocation.payableInstallment?.installmentNumber ?? 0,
        installmentId: allocation.payableInstallment?.id ?? '',
      })),
    }));
  }
}
