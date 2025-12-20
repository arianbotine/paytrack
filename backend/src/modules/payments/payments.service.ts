import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreatePaymentDto, QuickPaymentDto } from './dto/payment.dto';
import { MoneyUtils } from '../../shared/utils/money.utils';
import { MONEY_COMPARISON_THRESHOLD } from '../../shared/constants';
import { parseDatetime } from '../../shared/utils/date.utils';
import { CacheService } from '../../shared/services/cache.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async findAll(organizationId: string) {
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { organizationId },
        include: {
          allocations: {
            include: {
              payableInstallment: {
                select: {
                  id: true,
                  description: true,
                  installmentNumber: true,
                  totalInstallments: true,
                  payable: {
                    select: {
                      id: true,
                      description: true,
                      vendor: { select: { name: true } },
                    },
                  },
                },
              },
              receivableInstallment: {
                select: {
                  id: true,
                  description: true,
                  installmentNumber: true,
                  totalInstallments: true,
                  receivable: {
                    select: {
                      id: true,
                      description: true,
                      customer: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.payment.count({ where: { organizationId } }),
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

  async findOne(id: string, organizationId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: {
        allocations: {
          include: {
            payableInstallment: {
              select: {
                id: true,
                description: true,
                installmentNumber: true,
                totalInstallments: true,
                amount: true,
                payable: {
                  select: {
                    id: true,
                    description: true,
                    vendor: { select: { name: true } },
                  },
                },
              },
            },
            receivableInstallment: {
              select: {
                id: true,
                description: true,
                installmentNumber: true,
                totalInstallments: true,
                amount: true,
                receivable: {
                  select: {
                    id: true,
                    description: true,
                    customer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    const transformedPayment = MoneyUtils.transformMoneyFields(payment, [
      'amount',
    ]);

    const transformedAllocations = transformedPayment.allocations.map(
      allocation => ({
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

  async create(organizationId: string, createDto: CreatePaymentDto) {
    try {
      const { allocations, ...paymentData } = createDto;

      // Validar alocações
      this.validateAllocations(allocations, createDto.amount);

      // Validar cada alocação
      await this.validateAllocationInstallments(organizationId, allocations);

      // Criar pagamento com alocações em transação
      const result = await this.prisma.$transaction(async tx => {
        const payment = await tx.payment.create({
          data: {
            organizationId,
            amount: MoneyUtils.toDecimal(paymentData.amount),
            paymentDate: parseDatetime(paymentData.paymentDate),
            paymentMethod: paymentData.paymentMethod,
            notes: paymentData.notes,
            allocations: {
              create: allocations.map(a => ({
                payableInstallmentId: a.payableInstallmentId,
                receivableInstallmentId: a.receivableInstallmentId,
                amount: MoneyUtils.toDecimal(a.amount),
              })),
            },
          },
          include: {
            allocations: {
              include: {
                payableInstallment: {
                  select: {
                    id: true,
                    description: true,
                    installmentNumber: true,
                    totalInstallments: true,
                    payable: {
                      select: {
                        id: true,
                        description: true,
                        vendor: { select: { name: true } },
                      },
                    },
                  },
                },
                receivableInstallment: {
                  select: {
                    id: true,
                    description: true,
                    installmentNumber: true,
                    totalInstallments: true,
                    receivable: {
                      select: {
                        id: true,
                        description: true,
                        customer: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Atualizar saldos das parcelas
        await this.updateInstallmentBalances(tx, allocations);

        return payment;
      });

      this.cacheService.del(`dashboard:summary:${organizationId}`);

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(
          'Erro ao processar o pagamento: dados inválidos'
        );
      }
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          'Erro de validação nos dados do pagamento'
        );
      }
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Erro interno ao processar o pagamento');
    }
  }

  async quickPayment(organizationId: string, dto: QuickPaymentDto) {
    const createDto: CreatePaymentDto = {
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      allocations: [
        {
          ...(dto.type === 'payable'
            ? { payableInstallmentId: dto.installmentId }
            : { receivableInstallmentId: dto.installmentId }),
          amount: dto.amount,
        },
      ],
    };

    return this.create(organizationId, createDto);
  }

  async remove(id: string, organizationId: string) {
    const result = await this.prisma.$transaction(async tx => {
      const payment = await tx.payment.findFirst({
        where: { id, organizationId },
        include: {
          allocations: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Pagamento não encontrado');
      }

      // Reverter alocações
      await this.reverseInstallmentBalances(tx, payment.allocations);

      await tx.payment.delete({ where: { id } });

      return payment;
    });

    this.cacheService.del(`dashboard:summary:${organizationId}`);

    return result;
  }

  private async updateInstallmentBalances(
    tx: Prisma.TransactionClient,
    allocations: Array<{
      payableInstallmentId?: string;
      receivableInstallmentId?: string;
      amount: number;
    }>
  ) {
    // Atualizar parcelas de payable
    for (const allocation of allocations.filter(a => a.payableInstallmentId)) {
      const installment = await tx.payableInstallment.findUnique({
        where: { id: allocation.payableInstallmentId },
      });

      if (!installment) continue;

      const newPaidAmount = Number(installment.paidAmount) + allocation.amount;
      const totalAmount = Number(installment.amount);

      const newStatus = this.calculateInstallmentStatus(
        newPaidAmount,
        totalAmount,
        installment.dueDate
      );

      await tx.payableInstallment.update({
        where: { id: allocation.payableInstallmentId },
        data: {
          paidAmount: MoneyUtils.toDecimal(newPaidAmount),
          status: newStatus,
        },
      });

      // Atualizar status da conta principal
      await this.updateParentAccountStatus(
        tx,
        installment.payableId,
        'payable'
      );
    }

    // Atualizar parcelas de receivable
    for (const allocation of allocations.filter(
      a => a.receivableInstallmentId
    )) {
      const installment = await tx.receivableInstallment.findUnique({
        where: { id: allocation.receivableInstallmentId },
      });

      if (!installment) continue;

      const newReceivedAmount =
        Number(installment.receivedAmount) + allocation.amount;
      const totalAmount = Number(installment.amount);

      const newStatus = this.calculateInstallmentStatus(
        newReceivedAmount,
        totalAmount,
        installment.dueDate
      );

      await tx.receivableInstallment.update({
        where: { id: allocation.receivableInstallmentId },
        data: {
          receivedAmount: MoneyUtils.toDecimal(newReceivedAmount),
          status: newStatus,
        },
      });

      // Atualizar status da conta principal
      await this.updateParentAccountStatus(
        tx,
        installment.receivableId,
        'receivable'
      );
    }
  }

  private async reverseInstallmentBalances(
    tx: Prisma.TransactionClient,
    allocations: any[]
  ) {
    // Reverter parcelas de payable
    for (const allocation of allocations.filter(a => a.payableInstallmentId)) {
      const installment = await tx.payableInstallment.findUnique({
        where: { id: allocation.payableInstallmentId },
      });

      if (!installment) continue;

      const newPaidAmount = Math.max(
        0,
        Number(installment.paidAmount) - Number(allocation.amount)
      );

      const newStatus =
        newPaidAmount === 0
          ? this.getDefaultStatus(installment.dueDate)
          : AccountStatus.PARTIAL;

      await tx.payableInstallment.update({
        where: { id: allocation.payableInstallmentId },
        data: {
          paidAmount: MoneyUtils.toDecimal(newPaidAmount),
          status: newStatus,
        },
      });

      // Atualizar status da conta principal
      await this.updateParentAccountStatus(
        tx,
        installment.payableId,
        'payable'
      );
    }

    // Reverter parcelas de receivable
    for (const allocation of allocations.filter(
      a => a.receivableInstallmentId
    )) {
      const installment = await tx.receivableInstallment.findUnique({
        where: { id: allocation.receivableInstallmentId },
      });

      if (!installment) continue;

      const newReceivedAmount = Math.max(
        0,
        Number(installment.receivedAmount) - Number(allocation.amount)
      );

      const newStatus =
        newReceivedAmount === 0
          ? this.getDefaultStatus(installment.dueDate)
          : AccountStatus.PARTIAL;

      await tx.receivableInstallment.update({
        where: { id: allocation.receivableInstallmentId },
        data: {
          receivedAmount: MoneyUtils.toDecimal(newReceivedAmount),
          status: newStatus,
        },
      });

      // Atualizar status da conta principal
      await this.updateParentAccountStatus(
        tx,
        installment.receivableId,
        'receivable'
      );
    }
  }

  /**
   * Atualiza o status da conta principal baseado no status de todas as suas parcelas
   */
  private async updateParentAccountStatus(
    tx: Prisma.TransactionClient,
    accountId: string,
    type: 'payable' | 'receivable'
  ) {
    if (type === 'payable') {
      const installments = await tx.payableInstallment.findMany({
        where: { payableId: accountId },
      });

      const allPaid = installments.every(i => i.status === AccountStatus.PAID);
      const anyPaid = installments.some(
        i =>
          i.status === AccountStatus.PAID || i.status === AccountStatus.PARTIAL
      );
      const anyCancelled = installments.some(
        i => i.status === AccountStatus.CANCELLED
      );

      let newStatus: AccountStatus;
      if (allPaid && !anyCancelled) {
        newStatus = AccountStatus.PAID;
      } else if (anyPaid) {
        newStatus = AccountStatus.PARTIAL;
      } else {
        const account = await tx.payable.findUnique({
          where: { id: accountId },
        });
        newStatus = this.getDefaultStatus(account!.dueDate);
      }

      // Calcular totais
      const totalPaid = installments.reduce(
        (sum, i) => sum.plus(i.paidAmount),
        new Decimal(0)
      );

      await tx.payable.update({
        where: { id: accountId },
        data: {
          paidAmount: totalPaid,
          status: newStatus,
        },
      });
    } else {
      const installments = await tx.receivableInstallment.findMany({
        where: { receivableId: accountId },
      });

      const allPaid = installments.every(i => i.status === AccountStatus.PAID);
      const anyPaid = installments.some(
        i =>
          i.status === AccountStatus.PAID || i.status === AccountStatus.PARTIAL
      );
      const anyCancelled = installments.some(
        i => i.status === AccountStatus.CANCELLED
      );

      let newStatus: AccountStatus;
      if (allPaid && !anyCancelled) {
        newStatus = AccountStatus.PAID;
      } else if (anyPaid) {
        newStatus = AccountStatus.PARTIAL;
      } else {
        const account = await tx.receivable.findUnique({
          where: { id: accountId },
        });
        newStatus = this.getDefaultStatus(account!.dueDate);
      }

      // Calcular totais
      const totalReceived = installments.reduce(
        (sum, i) => sum.plus(i.receivedAmount),
        new Decimal(0)
      );

      await tx.receivable.update({
        where: { id: accountId },
        data: {
          receivedAmount: totalReceived,
          status: newStatus,
        },
      });
    }
  }

  private calculateInstallmentStatus(
    paidAmount: number,
    totalAmount: number,
    dueDate: Date
  ): AccountStatus {
    if (paidAmount >= totalAmount - MONEY_COMPARISON_THRESHOLD) {
      return AccountStatus.PAID;
    } else if (paidAmount > 0) {
      return AccountStatus.PARTIAL;
    } else {
      return this.getDefaultStatus(dueDate);
    }
  }

  private getDefaultStatus(dueDate: Date): AccountStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today ? AccountStatus.OVERDUE : AccountStatus.PENDING;
  }

  private validateAllocations(
    allocations: Array<{
      payableInstallmentId?: string;
      receivableInstallmentId?: string;
      amount: number;
    }>,
    totalAmount: number
  ) {
    if (!allocations || allocations.length === 0) {
      throw new BadRequestException('Pelo menos uma alocação é necessária');
    }

    const totalAllocation = allocations.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    );

    if (Math.abs(totalAllocation - totalAmount) > MONEY_COMPARISON_THRESHOLD) {
      throw new BadRequestException(
        'A soma das alocações deve ser igual ao valor do pagamento'
      );
    }

    // Cada alocação deve ter exatamente um installment
    for (const allocation of allocations) {
      if (
        !allocation.payableInstallmentId &&
        !allocation.receivableInstallmentId
      ) {
        throw new BadRequestException(
          'Cada alocação deve ter uma parcela (installment)'
        );
      }
      if (
        allocation.payableInstallmentId &&
        allocation.receivableInstallmentId
      ) {
        throw new BadRequestException(
          'Cada alocação deve ter apenas uma parcela'
        );
      }
    }
  }

  private async validateAllocationInstallments(
    organizationId: string,
    allocations: Array<{
      payableInstallmentId?: string;
      receivableInstallmentId?: string;
      amount: number;
    }>
  ) {
    for (const allocation of allocations) {
      if (allocation.payableInstallmentId) {
        await this.validatePayableInstallment(
          organizationId,
          allocation.payableInstallmentId,
          Number(allocation.amount)
        );
      }

      if (allocation.receivableInstallmentId) {
        await this.validateReceivableInstallment(
          organizationId,
          allocation.receivableInstallmentId,
          Number(allocation.amount)
        );
      }
    }
  }

  private async validatePayableInstallment(
    organizationId: string,
    installmentId: string,
    allocationAmount: number
  ) {
    const installment = await this.prisma.payableInstallment.findFirst({
      where: { id: installmentId, organizationId },
    });

    if (!installment) {
      throw new NotFoundException(
        `Parcela de conta a pagar não encontrada ou não pertence à sua organização`
      );
    }

    if (
      installment.status === AccountStatus.PAID ||
      installment.status === AccountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Parcela já está ${installment.status === AccountStatus.PAID ? 'paga' : 'cancelada'}`
      );
    }

    const remainingAmount =
      Number(installment.amount) - Number(installment.paidAmount);

    if (allocationAmount > remainingAmount + MONEY_COMPARISON_THRESHOLD) {
      throw new BadRequestException(
        `Valor da alocação (R$ ${allocationAmount.toFixed(2)}) maior que o saldo restante da parcela (R$ ${remainingAmount.toFixed(2)})`
      );
    }
  }

  private async validateReceivableInstallment(
    organizationId: string,
    installmentId: string,
    allocationAmount: number
  ) {
    const installment = await this.prisma.receivableInstallment.findFirst({
      where: { id: installmentId, organizationId },
    });

    if (!installment) {
      throw new NotFoundException(
        `Parcela de conta a receber não encontrada ou não pertence à sua organização`
      );
    }

    if (
      installment.status === AccountStatus.PAID ||
      installment.status === AccountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Parcela já está ${installment.status === AccountStatus.PAID ? 'recebida' : 'cancelada'}`
      );
    }

    const remainingAmount =
      Number(installment.amount) - Number(installment.receivedAmount);

    if (allocationAmount > remainingAmount + MONEY_COMPARISON_THRESHOLD) {
      throw new BadRequestException(
        `Valor da alocação (R$ ${allocationAmount.toFixed(2)}) maior que o saldo restante da parcela (R$ ${remainingAmount.toFixed(2)})`
      );
    }
  }
}
