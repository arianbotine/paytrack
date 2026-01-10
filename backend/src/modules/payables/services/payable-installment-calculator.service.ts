import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PayableStatus } from '../domain/payable-status.enum';

/**
 * Serviço responsável por cálculos relacionados a parcelas de contas a pagar
 */
@Injectable()
export class PayableInstallmentCalculator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula o valor restante de uma parcela (amount - paidAmount)
   */
  calculateRemainingAmount(
    amount: Decimal | number,
    paidAmount: Decimal | number
  ): number {
    const amountDecimal = new Decimal(amount);
    const paidAmountDecimal = new Decimal(paidAmount);
    return amountDecimal.minus(paidAmountDecimal).toNumber();
  }

  /**
   * Busca informações da próxima parcela não paga para múltiplas contas
   */
  async findNextUnpaidInstallments(
    payableIds: string[]
  ): Promise<Map<string, { dueDate: string; remainingAmount: number }>> {
    if (payableIds.length === 0) {
      return new Map();
    }

    const nextInstallments = await this.prisma.payableInstallment.findMany({
      where: {
        payableId: { in: payableIds },
        status: { in: [PayableStatus.PENDING, PayableStatus.PARTIAL] },
      },
      select: {
        payableId: true,
        dueDate: true,
        amount: true,
        paidAmount: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const result = new Map<
      string,
      { dueDate: string; remainingAmount: number }
    >();

    for (const installment of nextInstallments) {
      if (!result.has(installment.payableId)) {
        result.set(installment.payableId, {
          dueDate: installment.dueDate.toISOString().split('T')[0],
          remainingAmount: this.calculateRemainingAmount(
            installment.amount,
            installment.paidAmount
          ),
        });
      }
    }

    return result;
  }

  /**
   * Busca informações da próxima parcela não paga para uma conta específica
   */
  async findNextUnpaidInstallment(
    payableId: string
  ): Promise<{ dueDate: string; remainingAmount: number } | null> {
    const installment = await this.prisma.payableInstallment.findFirst({
      where: {
        payableId,
        status: { in: [PayableStatus.PENDING, PayableStatus.PARTIAL] },
      },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true, amount: true, paidAmount: true },
    });

    if (!installment) {
      return null;
    }

    return {
      dueDate: installment.dueDate.toISOString().split('T')[0],
      remainingAmount: this.calculateRemainingAmount(
        installment.amount,
        installment.paidAmount
      ),
    };
  }
}
