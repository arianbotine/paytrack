import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AccountStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreatePaymentDto, QuickPaymentDto } from "./dto/payment.dto";
import { MoneyUtils } from "../../shared/utils/money.utils";

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const payments = await this.prisma.payment.findMany({
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
      orderBy: { paymentDate: "desc" },
    });

    // Transform Decimal fields to numbers
    return MoneyUtils.transformMoneyFieldsArray(payments, ["amount"]);
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
      throw new NotFoundException("Pagamento não encontrado");
    }

    // Transform Decimal fields to numbers
    const transformedPayment = MoneyUtils.transformMoneyFields(payment, [
      "amount",
    ]);

    // Transform amounts in allocations
    const transformedAllocations = transformedPayment.allocations.map(
      (allocation) => ({
        ...allocation,
        payable: allocation.payable
          ? MoneyUtils.transformMoneyFields(allocation.payable, ["amount"])
          : allocation.payable,
        receivable: allocation.receivable
          ? MoneyUtils.transformMoneyFields(allocation.receivable, ["amount"])
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

      // Validate allocations
      this.validateAllocations(allocations, createDto.amount);

      // Validate each allocation
      await this.validateAllocationAccounts(organizationId, allocations);

      // Create payment with allocations in a transaction
      return await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            organizationId,
            amount: MoneyUtils.toDecimal(paymentData.amount),
            paymentDate: new Date(paymentData.paymentDate),
            paymentMethod: paymentData.paymentMethod,
            notes: paymentData.notes,
            allocations: {
              create: allocations.map((a) => ({
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

        // Update account balances
        for (const allocation of allocations) {
          if (allocation.payableId) {
            await this.updatePayableBalance(
              tx,
              allocation.payableId,
              allocation.amount
            );
          }

          if (allocation.receivableId) {
            await this.updateReceivableBalance(
              tx,
              allocation.receivableId,
              allocation.amount
            );
          }
        }

        return payment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(
          "Erro ao processar o pagamento: dados inválidos"
        );
      }
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          "Erro de validação nos dados do pagamento"
        );
      }
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error; // Re-throw validation errors
      }
      throw new BadRequestException("Erro interno ao processar o pagamento");
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
          ...(dto.type === "payable"
            ? { payableId: dto.accountId }
            : { receivableId: dto.accountId }),
          amount: dto.amount,
        },
      ],
    };

    return this.create(organizationId, createDto);
  }

  async remove(id: string, organizationId: string) {
    const payment = await this.findOne(id, organizationId);

    // Reverse allocations in a transaction
    return this.prisma.$transaction(async (tx) => {
      for (const allocation of payment.allocations) {
        if (allocation.payableId) {
          const payable = await tx.payable.findUnique({
            where: { id: allocation.payableId },
          });
          const newPaidAmount = Math.max(
            0,
            Number(payable!.paidAmount) - Number(allocation.amount)
          );

          let newStatus: AccountStatus;
          if (newPaidAmount === 0) {
            // Check if overdue
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            newStatus =
              payable!.dueDate < today
                ? AccountStatus.OVERDUE
                : AccountStatus.PENDING;
          } else {
            newStatus = AccountStatus.PARTIAL;
          }

          await tx.payable.update({
            where: { id: allocation.payableId },
            data: {
              paidAmount: MoneyUtils.toDecimal(newPaidAmount),
              status: newStatus,
            },
          });
        }

        if (allocation.receivableId) {
          const receivable = await tx.receivable.findUnique({
            where: { id: allocation.receivableId },
          });
          const newPaidAmount = Math.max(
            0,
            Number(receivable!.paidAmount) - Number(allocation.amount)
          );

          let newStatus: AccountStatus;
          if (newPaidAmount === 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            newStatus =
              receivable!.dueDate < today
                ? AccountStatus.OVERDUE
                : AccountStatus.PENDING;
          } else {
            newStatus = AccountStatus.PARTIAL;
          }

          await tx.receivable.update({
            where: { id: allocation.receivableId },
            data: {
              paidAmount: MoneyUtils.toDecimal(newPaidAmount),
              status: newStatus,
            },
          });
        }
      }

      await tx.payment.delete({ where: { id } });

      return payment;
    });
  }

  private validateAllocations(allocations: any[], totalAmount: number) {
    if (!allocations || allocations.length === 0) {
      throw new BadRequestException("Pelo menos uma alocação é necessária");
    }

    // Calculate total allocation
    const totalAllocation = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(totalAllocation - totalAmount) > 0.01) {
      throw new BadRequestException(
        "A soma das alocações deve ser igual ao valor do pagamento"
      );
    }
  }

  private async validateAllocationAccounts(
    organizationId: string,
    allocations: any[]
  ) {
    for (const allocation of allocations) {
      if (!allocation.payableId && !allocation.receivableId) {
        throw new BadRequestException(
          "Cada alocação deve ter uma conta a pagar ou a receber"
        );
      }
      if (allocation.payableId && allocation.receivableId) {
        throw new BadRequestException(
          "Cada alocação deve ter apenas uma conta"
        );
      }

      // Check account exists and belongs to organization
      if (allocation.payableId) {
        await this.validatePayableAccount(
          organizationId,
          allocation.payableId,
          allocation.amount
        );
      }

      if (allocation.receivableId) {
        await this.validateReceivableAccount(
          organizationId,
          allocation.receivableId,
          allocation.amount
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
      throw new NotFoundException(`Conta a pagar ${payableId} não encontrada`);
    }
    if (
      payable.status === AccountStatus.PAID ||
      payable.status === AccountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Conta a pagar já está ${payable.status === AccountStatus.PAID ? "paga" : "cancelada"}`
      );
    }

    const remainingAmount = Number(payable.amount) - Number(payable.paidAmount);
    if (allocationAmount > remainingAmount + 0.01) {
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
        `Conta a receber ${receivableId} não encontrada`
      );
    }
    if (
      receivable.status === AccountStatus.PAID ||
      receivable.status === AccountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Conta a receber já está ${receivable.status === AccountStatus.PAID ? "recebida" : "cancelada"}`
      );
    }

    const remainingAmount =
      Number(receivable.amount) - Number(receivable.paidAmount);
    if (allocationAmount > remainingAmount + 0.01) {
      throw new BadRequestException(
        `Valor da alocação maior que o saldo restante da conta (R$ ${remainingAmount.toFixed(2)})`
      );
    }
  }

  private async updatePayableBalance(
    tx: Prisma.TransactionClient,
    payableId: string,
    allocationAmount: number
  ) {
    const payable = await tx.payable.findUnique({ where: { id: payableId } });
    if (!payable) {
      throw new NotFoundException(`Conta a pagar ${payableId} não encontrada`);
    }

    const newPaidAmount = Number(payable.paidAmount) + allocationAmount;
    const totalAmount = Number(payable.amount);

    let newStatus: AccountStatus;
    if (newPaidAmount >= totalAmount - 0.01) {
      newStatus = AccountStatus.PAID;
    } else {
      newStatus = AccountStatus.PARTIAL;
    }

    await tx.payable.update({
      where: { id: payableId },
      data: {
        paidAmount: MoneyUtils.toDecimal(newPaidAmount),
        status: newStatus,
      },
    });
  }

  private async updateReceivableBalance(
    tx: Prisma.TransactionClient,
    receivableId: string,
    allocationAmount: number
  ) {
    const receivable = await tx.receivable.findUnique({
      where: { id: receivableId },
    });
    if (!receivable) {
      throw new NotFoundException(
        `Conta a receber ${receivableId} não encontrada`
      );
    }

    const newPaidAmount = Number(receivable.paidAmount) + allocationAmount;
    const totalAmount = Number(receivable.amount);

    let newStatus: AccountStatus;
    if (newPaidAmount >= totalAmount - 0.01) {
      newStatus = AccountStatus.PAID;
    } else {
      newStatus = AccountStatus.PARTIAL;
    }

    await tx.receivable.update({
      where: { id: receivableId },
      data: {
        paidAmount: MoneyUtils.toDecimal(newPaidAmount),
        status: newStatus,
      },
    });
  }
}
