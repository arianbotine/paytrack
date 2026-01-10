import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReceivableStatus } from '../domain/receivable-status.enum';

/**
 * Serviço responsável por cálculos relacionados a parcelas de contas a receber
 */
@Injectable()
export class ReceivableInstallmentCalculator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula o valor restante de uma parcela (amount - receivedAmount)
   */
  calculateRemainingAmount(
    amount: Decimal | number,
    receivedAmount: Decimal | number
  ): number {
    const amountDecimal = new Decimal(amount);
    const receivedAmountDecimal = new Decimal(receivedAmount);
    return amountDecimal.minus(receivedAmountDecimal).toNumber();
  }

  /**
   * Busca informações da próxima parcela não recebida para múltiplas contas
   */
  async findNextUnpaidInstallments(
    receivableIds: string[]
  ): Promise<Map<string, { dueDate: string; remainingAmount: number }>> {
    if (receivableIds.length === 0) {
      return new Map();
    }

    const nextInstallments = await this.prisma.receivableInstallment.findMany({
      where: {
        receivableId: { in: receivableIds },
        status: { in: [ReceivableStatus.PENDING, ReceivableStatus.PARTIAL] },
      },
      select: {
        receivableId: true,
        dueDate: true,
        amount: true,
        receivedAmount: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const result = new Map<
      string,
      { dueDate: string; remainingAmount: number }
    >();

    for (const installment of nextInstallments) {
      if (!result.has(installment.receivableId)) {
        result.set(installment.receivableId, {
          dueDate: installment.dueDate.toISOString().split('T')[0],
          remainingAmount: this.calculateRemainingAmount(
            installment.amount,
            installment.receivedAmount
          ),
        });
      }
    }

    return result;
  }

  /**
   * Busca informações da próxima parcela não recebida para uma conta específica
   */
  async findNextUnpaidInstallment(
    receivableId: string
  ): Promise<{ dueDate: string; remainingAmount: number } | null> {
    const installment = await this.prisma.receivableInstallment.findFirst({
      where: {
        receivableId,
        status: { in: [ReceivableStatus.PENDING, ReceivableStatus.PARTIAL] },
      },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true, amount: true, receivedAmount: true },
    });

    if (!installment) {
      return null;
    }

    return {
      dueDate: installment.dueDate.toISOString().split('T')[0],
      remainingAmount: this.calculateRemainingAmount(
        installment.amount,
        installment.receivedAmount
      ),
    };
  }
}
