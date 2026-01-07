import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MONEY_COMPARISON_THRESHOLD } from '../../../shared/constants';

interface AllocationDto {
  payableInstallmentId?: string;
  receivableInstallmentId?: string;
  amount: number;
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
}
