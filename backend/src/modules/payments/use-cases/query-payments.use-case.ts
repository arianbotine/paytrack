import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsRepository } from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { PaymentFilterDto } from '../dto/payment.dto';
import { parseDateOnly } from '../../../shared/utils/date.utils';

/**
 * Use Case: Listar todos os pagamentos
 */
@Injectable()
export class ListPaymentsUseCase {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async execute(organizationId: string, filters: PaymentFilterDto) {
    const where: Prisma.PaymentWhereInput = { organizationId };

    // Filtro por método de pagamento
    if (filters.paymentMethod && filters.paymentMethod.length > 0) {
      where.paymentMethod = { in: filters.paymentMethod };
    }

    // Filtro por tipo (payable ou receivable)
    if (filters.type) {
      if (filters.type === 'payable') {
        where.allocations = {
          some: {
            payableInstallmentId: { not: null },
          },
        };
      } else {
        where.allocations = {
          some: {
            receivableInstallmentId: { not: null },
          },
        };
      }
    }

    // Filtro por vendor (através das alocações)
    if (filters.vendorId) {
      where.allocations = {
        some: {
          payableInstallment: {
            payable: {
              vendorId: filters.vendorId,
            },
          },
        },
      };
    }

    // Filtro por customer (através das alocações)
    if (filters.customerId) {
      where.allocations = {
        some: {
          receivableInstallment: {
            receivable: {
              customerId: filters.customerId,
            },
          },
        },
      };
    }

    // Filtro por data de pagamento
    if (filters.paymentDateFrom || filters.paymentDateTo) {
      where.paymentDate = {};
      if (filters.paymentDateFrom) {
        where.paymentDate.gte = parseDateOnly(filters.paymentDateFrom);
      }
      if (filters.paymentDateTo) {
        const toDate = parseDateOnly(filters.paymentDateTo);
        toDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = toDate;
      }
    }

    const [data, total] = await Promise.all([
      this.paymentsRepository.findMany(where, {
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
        skip: filters.skip,
        take: filters.take,
      }),
      this.paymentsRepository.count(where),
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
