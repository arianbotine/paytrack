import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MONEY_COMPARISON_THRESHOLD } from '../../../shared/constants';

interface AllocationDto {
  payableInstallmentId?: string;
  receivableInstallmentId?: string;
  amount: number;
}

interface OverpaymentAllocationIssue {
  installmentId: string;
  installmentNumber: number;
  accountType: 'PAYABLE' | 'RECEIVABLE';
  currentAmount: number;
  currentPaidOrReceivedAmount: number;
  remainingAmount: number;
  allocationAmount: number;
  extraAmount: number;
}

/**
 * Serviço de domínio para validar alocações de pagamentos
 */
@Injectable()
export class PaymentAllocationsValidator {
  /**
   * Valida se o total das alocações corresponde ao valor do pagamento
   */
  validateAllocationsSum(
    allocations: AllocationDto[],
    paymentAmount: number
  ): void {
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    const difference = Math.abs(totalAllocated - paymentAmount);

    if (difference > MONEY_COMPARISON_THRESHOLD) {
      throw new BadRequestException(
        `O total das alocações (${totalAllocated}) deve ser igual ao valor do pagamento (${paymentAmount})`
      );
    }
  }

  /**
   * Valida se cada alocação tem exatamente uma parcela associada
   */
  validateAllocationTargets(allocations: AllocationDto[]): void {
    for (const allocation of allocations) {
      const hasPayable = !!allocation.payableInstallmentId;
      const hasReceivable = !!allocation.receivableInstallmentId;

      if (hasPayable === hasReceivable) {
        throw new BadRequestException(
          'Cada alocação deve ter exatamente uma parcela (payable ou receivable)'
        );
      }

      if (allocation.amount <= 0) {
        throw new BadRequestException(
          'O valor da alocação deve ser maior que zero'
        );
      }
    }
  }

  /**
   * Valida se as parcelas existem e pertencem à organização
   */
  async validateInstallmentsExist(
    tx: Prisma.TransactionClient,
    organizationId: string,
    allocations: AllocationDto[]
  ): Promise<void> {
    // Validar parcelas de payable
    const payableInstallmentIds = allocations
      .filter(a => a.payableInstallmentId)
      .map(a => a.payableInstallmentId!);

    if (payableInstallmentIds.length > 0) {
      const payableInstallments = await tx.payableInstallment.findMany({
        where: {
          id: { in: payableInstallmentIds },
          payable: { organizationId },
        },
      });

      if (payableInstallments.length !== payableInstallmentIds.length) {
        throw new NotFoundException(
          'Uma ou mais parcelas de conta a pagar não foram encontradas'
        );
      }
    }

    // Validar parcelas de receivable
    const receivableInstallmentIds = allocations
      .filter(a => a.receivableInstallmentId)
      .map(a => a.receivableInstallmentId!);

    if (receivableInstallmentIds.length > 0) {
      const receivableInstallments = await tx.receivableInstallment.findMany({
        where: {
          id: { in: receivableInstallmentIds },
          receivable: { organizationId },
        },
      });

      if (receivableInstallments.length !== receivableInstallmentIds.length) {
        throw new NotFoundException(
          'Uma ou mais parcelas de conta a receber não foram encontradas'
        );
      }
    }
  }

  /**
   * Valida se as alocações excedem o valor restante e retorna detalhes para ajuste.
   * Quando confirmOverpayment=false, lança erro para solicitar confirmação no frontend.
   */
  async validateOverpaymentAndGetIssues(
    tx: Prisma.TransactionClient,
    organizationId: string,
    allocations: AllocationDto[],
    confirmOverpayment = false
  ): Promise<OverpaymentAllocationIssue[]> {
    const overpaymentIssues: OverpaymentAllocationIssue[] = [];

    const payableInstallmentIds = allocations
      .filter(a => a.payableInstallmentId)
      .map(a => a.payableInstallmentId!);

    const receivableInstallmentIds = allocations
      .filter(a => a.receivableInstallmentId)
      .map(a => a.receivableInstallmentId!);

    const payableInstallments =
      payableInstallmentIds.length > 0
        ? await tx.payableInstallment.findMany({
            where: {
              id: { in: payableInstallmentIds },
              payable: { organizationId },
            },
            select: {
              id: true,
              installmentNumber: true,
              amount: true,
              paidAmount: true,
            },
          })
        : [];

    const receivableInstallments =
      receivableInstallmentIds.length > 0
        ? await tx.receivableInstallment.findMany({
            where: {
              id: { in: receivableInstallmentIds },
              receivable: { organizationId },
            },
            select: {
              id: true,
              installmentNumber: true,
              amount: true,
              receivedAmount: true,
            },
          })
        : [];

    const payableMap = new Map(
      payableInstallments.map(inst => [inst.id, inst])
    );
    const receivableMap = new Map(
      receivableInstallments.map(inst => [inst.id, inst])
    );

    for (const allocation of allocations) {
      if (allocation.payableInstallmentId) {
        const installment = payableMap.get(allocation.payableInstallmentId);
        if (!installment) continue;

        const currentAmount = Number(installment.amount);
        const currentPaid = Number(installment.paidAmount);
        const remainingAmount = Math.max(0, currentAmount - currentPaid);

        if (allocation.amount - remainingAmount > MONEY_COMPARISON_THRESHOLD) {
          const extraAmount = allocation.amount - remainingAmount;
          overpaymentIssues.push({
            installmentId: installment.id,
            installmentNumber: installment.installmentNumber,
            accountType: 'PAYABLE',
            currentAmount,
            currentPaidOrReceivedAmount: currentPaid,
            remainingAmount,
            allocationAmount: allocation.amount,
            extraAmount,
          });
        }
      }

      if (allocation.receivableInstallmentId) {
        const installment = receivableMap.get(
          allocation.receivableInstallmentId
        );
        if (!installment) continue;

        const currentAmount = Number(installment.amount);
        const currentReceived = Number(installment.receivedAmount);
        const remainingAmount = Math.max(0, currentAmount - currentReceived);

        if (allocation.amount - remainingAmount > MONEY_COMPARISON_THRESHOLD) {
          const extraAmount = allocation.amount - remainingAmount;
          overpaymentIssues.push({
            installmentId: installment.id,
            installmentNumber: installment.installmentNumber,
            accountType: 'RECEIVABLE',
            currentAmount,
            currentPaidOrReceivedAmount: currentReceived,
            remainingAmount,
            allocationAmount: allocation.amount,
            extraAmount,
          });
        }
      }
    }

    if (overpaymentIssues.length > 0 && !confirmOverpayment) {
      throw new UnprocessableEntityException({
        message:
          'O valor informado excede o valor restante da conta/parcela. Confirme para ajustar o valor da conta e registrar o pagamento/recebimento.',
        code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
        overpayments: overpaymentIssues,
      });
    }

    return overpaymentIssues;
  }
}
