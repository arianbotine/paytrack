import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentsRepository } from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';

/**
 * Use Case: Listar todos os pagamentos
 */
@Injectable()
export class ListPaymentsUseCase {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async execute(organizationId: string) {
    const [data, total] = await Promise.all([
      this.paymentsRepository.findMany(
        { organizationId },
        {
          include: {
            allocations: {
              include: {
                payableInstallment: {
                  select: {
                    id: true,
                    installmentNumber: true,
                    totalInstallments: true,
                    payable: {
                      select: {
                        id: true,
                        vendor: { select: { name: true } },
                      },
                    },
                  },
                },
                receivableInstallment: {
                  select: {
                    id: true,
                    installmentNumber: true,
                    totalInstallments: true,
                    receivable: {
                      select: {
                        id: true,
                        customer: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ paymentDate: 'desc' }],
        }
      ),
      this.paymentsRepository.count({ organizationId }),
    ]);

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
    ]);

    const mappedData = transformedData.map(payment => ({
      ...payment,
      method: payment.paymentMethod,
      paymentMethod: undefined,
    }));

    return { data: mappedData, total };
  }
}

/**
 * Use Case: Buscar um pagamento por ID
 */
@Injectable()
export class GetPaymentUseCase {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async execute(id: string, organizationId: string) {
    const payment = await this.paymentsRepository.findFirst(
      { id, organizationId },
      {
        allocations: {
          include: {
            payableInstallment: {
              select: {
                id: true,
                installmentNumber: true,
                totalInstallments: true,
                amount: true,
                payable: {
                  select: {
                    id: true,
                    vendor: { select: { name: true } },
                  },
                },
              },
            },
            receivableInstallment: {
              select: {
                id: true,
                installmentNumber: true,
                totalInstallments: true,
                amount: true,
                receivable: {
                  select: {
                    id: true,
                    customer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      }
    );

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    const transformedPayment = MoneyUtils.transformMoneyFields(payment, [
      'amount',
    ]);

    const transformedAllocations = (transformedPayment as any).allocations.map(
      (allocation: any) => ({
        ...allocation,
        payableInstallment: allocation.payableInstallment
          ? MoneyUtils.transformMoneyFields(allocation.payableInstallment, [
              'amount',
            ])
          : allocation.payableInstallment,
        receivableInstallment: allocation.receivableInstallment
          ? MoneyUtils.transformMoneyFields(allocation.receivableInstallment, [
              'amount',
            ])
          : allocation.receivableInstallment,
      })
    );

    return {
      ...transformedPayment,
      allocations: transformedAllocations,
    };
  }
}
