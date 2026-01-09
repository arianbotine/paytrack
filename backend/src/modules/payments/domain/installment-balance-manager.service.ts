import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, AccountStatus } from '@prisma/client';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serviço de domínio para gerenciar atualizações de saldo de parcelas
 * Centraliza lógica de cálculo de status e atualização de valores pagos/recebidos
 */
@Injectable()
export class InstallmentBalanceManager {
  /**
   * Calcula o status de uma parcela com base no valor pago/recebido
   * Nota: Vencimento não é mais um status, será calculado separadamente via isOverdue()
   */
  calculateInstallmentStatus(
    paidOrReceivedAmount: number,
    totalAmount: number
  ): AccountStatus {
    const threshold = 0.01;

    if (paidOrReceivedAmount >= totalAmount - threshold) {
      return AccountStatus.PAID;
    } else if (paidOrReceivedAmount > 0) {
      return AccountStatus.PARTIAL;
    }

    return AccountStatus.PENDING;
  }

  /**
   * Atualiza saldo de uma parcela de payable
   */
  async updatePayableInstallmentBalance(
    tx: Prisma.TransactionClient,
    installmentId: string,
    amountToAdd: number
  ): Promise<void> {
    const installment = await tx.payableInstallment.findUnique({
      where: { id: installmentId },
    });

    if (!installment) {
      throw new BadRequestException('Parcela de conta a pagar não encontrada');
    }

    const newPaidAmount = Number(installment.paidAmount) + amountToAdd;
    const totalAmount = Number(installment.amount);

    const newStatus = this.calculateInstallmentStatus(
      newPaidAmount,
      totalAmount
    );

    await tx.payableInstallment.update({
      where: { id: installmentId },
      data: {
        paidAmount: MoneyUtils.toDecimal(newPaidAmount),
        status: newStatus,
      },
    });

    // Atualizar conta principal
    await this.updatePayableAccountStatus(tx, installment.payableId);
  }

  /**
   * Atualiza saldo de uma parcela de receivable
   */
  async updateReceivableInstallmentBalance(
    tx: Prisma.TransactionClient,
    installmentId: string,
    amountToAdd: number
  ): Promise<void> {
    const installment = await tx.receivableInstallment.findUnique({
      where: { id: installmentId },
    });

    if (!installment) {
      throw new BadRequestException(
        'Parcela de conta a receber não encontrada'
      );
    }

    const newReceivedAmount = Number(installment.receivedAmount) + amountToAdd;
    const totalAmount = Number(installment.amount);

    const newStatus = this.calculateInstallmentStatus(
      newReceivedAmount,
      totalAmount
    );

    await tx.receivableInstallment.update({
      where: { id: installmentId },
      data: {
        receivedAmount: MoneyUtils.toDecimal(newReceivedAmount),
        status: newStatus,
      },
    });

    // Atualizar conta principal
    await this.updateReceivableAccountStatus(tx, installment.receivableId);
  }

  /**
   * Atualiza o status da conta a pagar principal baseado nas parcelas
   */
  private async updatePayableAccountStatus(
    tx: Prisma.TransactionClient,
    payableId: string
  ): Promise<void> {
    const installments = await tx.payableInstallment.findMany({
      where: { payableId },
    });

    const allPaid = installments.every(i => i.status === AccountStatus.PAID);
    const anyPaid = installments.some(
      i => i.status === AccountStatus.PAID || i.status === AccountStatus.PARTIAL
    );

    let newStatus: AccountStatus;
    if (allPaid) {
      newStatus = AccountStatus.PAID;
    } else if (anyPaid) {
      newStatus = AccountStatus.PARTIAL;
    } else {
      newStatus = AccountStatus.PENDING;
    }

    const totalPaid = installments.reduce(
      (sum, i) => sum.plus(i.paidAmount),
      new Decimal(0)
    );

    await tx.payable.update({
      where: { id: payableId },
      data: {
        paidAmount: totalPaid,
        status: newStatus,
      },
    });
  }

  /**
   * Atualiza o status da conta a receber principal baseado nas parcelas
   */
  private async updateReceivableAccountStatus(
    tx: Prisma.TransactionClient,
    receivableId: string
  ): Promise<void> {
    const installments = await tx.receivableInstallment.findMany({
      where: { receivableId },
    });

    const allPaid = installments.every(i => i.status === AccountStatus.PAID);
    const anyPaid = installments.some(
      i => i.status === AccountStatus.PAID || i.status === AccountStatus.PARTIAL
    );

    let newStatus: AccountStatus;
    if (allPaid) {
      newStatus = AccountStatus.PAID;
    } else if (anyPaid) {
      newStatus = AccountStatus.PARTIAL;
    } else {
      newStatus = AccountStatus.PENDING;
    }

    const totalReceived = installments.reduce(
      (sum, i) => sum.plus(i.receivedAmount),
      new Decimal(0)
    );

    await tx.receivable.update({
      where: { id: receivableId },
      data: {
        receivedAmount: totalReceived,
        status: newStatus,
      },
    });
  }

  /**
   * Reverte o saldo de uma parcela de payable
   */
  async reversePayableInstallmentBalance(
    tx: Prisma.TransactionClient,
    installmentId: string,
    amountToSubtract: number
  ): Promise<void> {
    const installment = await tx.payableInstallment.findUnique({
      where: { id: installmentId },
    });

    if (!installment) return;

    const newPaidAmount = Math.max(
      0,
      Number(installment.paidAmount) - amountToSubtract
    );

    const newStatus =
      newPaidAmount === 0 ? AccountStatus.PENDING : AccountStatus.PARTIAL;

    await tx.payableInstallment.update({
      where: { id: installmentId },
      data: {
        paidAmount: MoneyUtils.toDecimal(newPaidAmount),
        status: newStatus,
      },
    });

    await this.updatePayableAccountStatus(tx, installment.payableId);
  }

  /**
   * Reverte o saldo de uma parcela de receivable
   */
  async reverseReceivableInstallmentBalance(
    tx: Prisma.TransactionClient,
    installmentId: string,
    amountToSubtract: number
  ): Promise<void> {
    const installment = await tx.receivableInstallment.findUnique({
      where: { id: installmentId },
    });

    if (!installment) return;

    const newReceivedAmount = Math.max(
      0,
      Number(installment.receivedAmount) - amountToSubtract
    );

    const newStatus =
      newReceivedAmount === 0 ? AccountStatus.PENDING : AccountStatus.PARTIAL;

    await tx.receivableInstallment.update({
      where: { id: installmentId },
      data: {
        receivedAmount: MoneyUtils.toDecimal(newReceivedAmount),
        status: newStatus,
      },
    });

    await this.updateReceivableAccountStatus(tx, installment.receivableId);
  }
}
