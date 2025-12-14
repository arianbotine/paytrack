import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreatePaymentDto,
  QuickPaymentDto,
  QuickPaymentAllocationDto,
} from './dto/payment.dto';
import { MoneyUtils } from '../../shared/utils/money.utils';
import { MONEY_COMPARISON_THRESHOLD } from '../../shared/constants';
import { parseDateUTC } from '../../shared/utils/date.utils';

type Allocation = {
  payableId?: string;
  receivableId?: string;
  amount: number;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { organizationId },
        include: {
          allocations: {
            include: {
              payable: {
                select: {
                  id: true,
                  description: true,
                  vendor: { select: { name: true } },
                },
              },
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
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.payment.count({ where: { organizationId } }),
    ]);

    // Transform Decimal fields to numbers
    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
    ]);

    // Map paymentMethod to method for frontend compatibility
    const mappedData = transformedData.map(payment => ({
      ...payment,
      method: payment.paymentMethod,
      paymentMethod: undefined, // Remove the original field
    }));

    return { data: mappedData, total };
  }

  async findOne(id: string, organizationId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: {
        allocations: {
          include: {
            payable: {
              select: {
                id: true,
                description: true,
                amount: true,
                vendor: { select: { name: true } },
              },
            },
            receivable: {
              select: {
                id: true,
                description: true,
                amount: true,
                customer: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Transform Decimal fields to numbers
    const transformedPayment = MoneyUtils.transformMoneyFields(payment, [
      'amount',
    ]);

    // Transform amounts in allocations
    const transformedAllocations = transformedPayment.allocations.map(
      allocation => ({
        ...allocation,
        payable: allocation.payable
          ? MoneyUtils.transformMoneyFields(allocation.payable, ['amount'])
          : allocation.payable,
        receivable: allocation.receivable
          ? MoneyUtils.transformMoneyFields(allocation.receivable, ['amount'])
          : allocation.receivable,
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

      // Convert allocations amount to number for validation
      const typedAllocations: Allocation[] = allocations.map(a => ({
        payableId: a.payableId,
        receivableId: a.receivableId,
        amount: Number(a.amount),
      }));

      // Validate allocations
      this.validateAllocations(typedAllocations, createDto.amount);

      // Validate each allocation
      await this.validateAllocationAccounts(organizationId, typedAllocations);

      // Create payment with allocations in a transaction
      return await this.createPaymentWithAllocations(
        organizationId,
        paymentData,
        allocations
      );
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
        throw error; // Re-throw validation errors
      }
      throw new BadRequestException('Erro interno ao processar o pagamento');
    }
  }

  // Simplified payment for single account
  async quickPayment(organizationId: string, dto: QuickPaymentDto) {
    const createDto: CreatePaymentDto = {
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      allocations: [
        {
          ...(dto.type === 'payable'
            ? { payableId: dto.accountId }
            : { receivableId: dto.accountId }),
          amount: dto.amount,
        },
      ],
    };

    return this.create(organizationId, createDto);
  }

  private async createPaymentWithAllocations(
    organizationId: string,
    paymentData: Omit<CreatePaymentDto, 'allocations'>,
    allocations: QuickPaymentAllocationDto[]
  ) {
    return this.prisma.$transaction(async tx => {
      const payment = await tx.payment.create({
        data: {
          organizationId,
          amount: MoneyUtils.toDecimal(paymentData.amount),
          paymentDate: parseDateUTC(paymentData.paymentDate),
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes,
          allocations: {
            create: allocations.map(a => ({
              payableId: a.payableId,
              receivableId: a.receivableId,
              amount: MoneyUtils.toDecimal(a.amount),
            })),
          },
        },
        include: {
          allocations: true,
        },
      });

      // Update account balances using bulk operations
      await this.updateAccountBalancesBulk(tx, allocations);

      return payment;
    });
  }

  async remove(id: string, organizationId: string) {
    // Move findOne inside transaction to prevent race condition
    return this.prisma.$transaction(async tx => {
      const payment = await tx.payment.findFirst({
        where: { id, organizationId },
        include: {
          allocations: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Pagamento não encontrado');
      }

      // Reverse allocations using bulk operations
      await this.reversePaymentAllocationsBulk(tx, payment.allocations);

      await tx.payment.delete({ where: { id } });

      return payment;
    });
  }

  /**
   * Bulk update account balances for multiple allocations
   * Optimized to avoid N+1 query problem
   */
  private async updateAccountBalancesBulk(
    tx: Prisma.TransactionClient,
    allocations: { payableId?: string; receivableId?: string; amount: number }[]
  ) {
    // Group allocations by payable/receivable
    const payableIds = allocations
      .filter(a => a.payableId)
      .map(a => a.payableId!);
    const receivableIds = allocations
      .filter(a => a.receivableId)
      .map(a => a.receivableId!);

    // Fetch all accounts in bulk
    const [payables, receivables] = await Promise.all([
      payableIds.length > 0
        ? tx.payable.findMany({
            where: { id: { in: payableIds } },
            include: { allocations: true },
          })
        : [],
      receivableIds.length > 0
        ? tx.receivable.findMany({
            where: { id: { in: receivableIds } },
            include: { allocations: true },
          })
        : [],
    ]);

    // Update payables
    for (const allocation of allocations.filter(a => a.payableId)) {
      const payable = payables.find(p => p.id === allocation.payableId);
      if (!payable) {
        throw new NotFoundException(
          `Conta a pagar ${allocation.payableId} não encontrada`
        );
      }

      const newPaidAmount = Number(payable.paidAmount) + allocation.amount;
      const totalAmount = Number(payable.amount);

      if (newPaidAmount > totalAmount + MONEY_COMPARISON_THRESHOLD) {
        throw new BadRequestException(
          `Valor pago (R$ ${newPaidAmount.toFixed(2)}) não pode exceder o valor total (R$ ${totalAmount.toFixed(2)})`
        );
      }

      const newStatus = this.calculateAccountStatus(
        newPaidAmount,
        totalAmount,
        payable.dueDate
      );

      await tx.payable.update({
        where: { id: allocation.payableId },
        data: {
          paidAmount: MoneyUtils.toDecimal(newPaidAmount),
          status: newStatus,
        },
      });
    }

    // Update receivables
    for (const allocation of allocations.filter(a => a.receivableId)) {
      const receivable = receivables.find(
        r => r.id === allocation.receivableId
      );
      if (!receivable) {
        throw new NotFoundException(
          `Conta a receber ${allocation.receivableId} não encontrada`
        );
      }

      const newPaidAmount =
        Number(receivable.receivedAmount) + allocation.amount;
      const totalAmount = Number(receivable.amount);

      if (newPaidAmount > totalAmount + MONEY_COMPARISON_THRESHOLD) {
        throw new BadRequestException(
          `Valor recebido (R$ ${newPaidAmount.toFixed(2)}) não pode exceder o valor total (R$ ${totalAmount.toFixed(2)})`
        );
      }

      const newStatus = this.calculateAccountStatus(
        newPaidAmount,
        totalAmount,
        receivable.dueDate
      );

      await tx.receivable.update({
        where: { id: allocation.receivableId },
        data: {
          paidAmount: MoneyUtils.toDecimal(newPaidAmount),
          status: newStatus,
        },
      });
    }
  }

  /**
   * Bulk reverse allocations when deleting a payment
   * Optimized to avoid N+1 query problem
   */
  private async reversePaymentAllocationsBulk(
    tx: Prisma.TransactionClient,
    allocations: any[]
  ) {
    const payableIds = allocations
      .filter(a => a.payableId)
      .map(a => a.payableId);
    const receivableIds = allocations
      .filter(a => a.receivableId)
      .map(a => a.receivableId);

    // Fetch all accounts in bulk
    const [payables, receivables] = await Promise.all([
      payableIds.length > 0
        ? tx.payable.findMany({ where: { id: { in: payableIds } } })
        : [],
      receivableIds.length > 0
        ? tx.receivable.findMany({ where: { id: { in: receivableIds } } })
        : [],
    ]);

    // Update payables
    for (const allocation of allocations.filter(a => a.payableId)) {
      const payable = payables.find(p => p.id === allocation.payableId);
      if (!payable) continue;

      const newPaidAmount = Math.max(
        0,
        Number(payable.paidAmount) - Number(allocation.amount)
      );

      const newStatus =
        newPaidAmount === 0
          ? this.getDefaultStatus(payable.dueDate)
          : AccountStatus.PARTIAL;

      await tx.payable.update({
        where: { id: allocation.payableId },
        data: {
          paidAmount: MoneyUtils.toDecimal(newPaidAmount),
          status: newStatus,
        },
      });
    }

    // Update receivables
    for (const allocation of allocations.filter(a => a.receivableId)) {
      const receivable = receivables.find(
        r => r.id === allocation.receivableId
      );
      if (!receivable) continue;

      const newPaidAmount = Math.max(
        0,
        Number(receivable.receivedAmount) - Number(allocation.amount)
      );

      const newStatus =
        newPaidAmount === 0
          ? this.getDefaultStatus(receivable.dueDate)
          : AccountStatus.PARTIAL;

      await tx.receivable.update({
        where: { id: allocation.receivableId },
        data: {
          paidAmount: MoneyUtils.toDecimal(newPaidAmount),
          status: newStatus,
        },
      });
    }
  }

  /**
   * Calculate account status based on paid amount and due date
   */
  private calculateAccountStatus(
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

  /**
   * Get default status (PENDING or OVERDUE) based on due date
   */
  private getDefaultStatus(dueDate: Date): AccountStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today ? AccountStatus.OVERDUE : AccountStatus.PENDING;
  }

  private validateAllocations(allocations: Allocation[], totalAmount: number) {
    if (!allocations || allocations.length === 0) {
      throw new BadRequestException('Pelo menos uma alocação é necessária');
    }

    // Calculate total allocation
    const totalAllocation = allocations.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    );
    if (Math.abs(totalAllocation - totalAmount) > MONEY_COMPARISON_THRESHOLD) {
      throw new BadRequestException(
        'A soma das alocações deve ser igual ao valor do pagamento'
      );
    }
  }

  private async validateAllocationAccounts(
    organizationId: string,
    allocations: Allocation[]
  ) {
    for (const allocation of allocations) {
      if (!allocation.payableId && !allocation.receivableId) {
        throw new BadRequestException(
          'Cada alocação deve ter uma conta a pagar ou a receber'
        );
      }
      if (allocation.payableId && allocation.receivableId) {
        throw new BadRequestException(
          'Cada alocação deve ter apenas uma conta'
        );
      }

      // Check account exists and belongs to organization
      if (allocation.payableId) {
        await this.validatePayableAccount(
          organizationId,
          allocation.payableId,
          Number(allocation.amount)
        );
      }

      if (allocation.receivableId) {
        await this.validateReceivableAccount(
          organizationId,
          allocation.receivableId,
          Number(allocation.amount)
        );
      }
    }
  }

  private async validatePayableAccount(
    organizationId: string,
    payableId: string,
    allocationAmount: number
  ) {
    const payable = await this.prisma.payable.findFirst({
      where: { id: payableId, organizationId },
    });
    if (!payable) {
      throw new NotFoundException(
        `Conta a pagar ${payableId} não encontrada ou não pertence à sua organização`
      );
    }
    if (
      payable.status === AccountStatus.PAID ||
      payable.status === AccountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Conta a pagar já está ${payable.status === AccountStatus.PAID ? 'paga' : 'cancelada'}`
      );
    }

    const remainingAmount = Number(payable.amount) - Number(payable.paidAmount);
    if (allocationAmount > remainingAmount + MONEY_COMPARISON_THRESHOLD) {
      throw new BadRequestException(
        `Valor da alocação maior que o saldo restante da conta (R$ ${remainingAmount.toFixed(2)})`
      );
    }
  }

  private async validateReceivableAccount(
    organizationId: string,
    receivableId: string,
    allocationAmount: number
  ) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id: receivableId, organizationId },
    });
    if (!receivable) {
      throw new NotFoundException(
        `Conta a receber ${receivableId} não encontrada ou não pertence à sua organização`
      );
    }
    if (
      receivable.status === AccountStatus.PAID ||
      receivable.status === AccountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Conta a receber já está ${receivable.status === AccountStatus.PAID ? 'recebida' : 'cancelada'}`
      );
    }

    const remainingAmount =
      Number(receivable.amount) - Number(receivable.receivedAmount);
    if (allocationAmount > remainingAmount + MONEY_COMPARISON_THRESHOLD) {
      throw new BadRequestException(
        `Valor da alocação maior que o saldo restante da conta (R$ ${remainingAmount.toFixed(2)})`
      );
    }
  }
}
