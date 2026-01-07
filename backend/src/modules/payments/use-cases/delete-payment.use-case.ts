import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentsRepository } from '../repositories';
import { InstallmentBalanceManager } from '../domain';
import { CacheService } from '../../../shared/services/cache.service';

/**
 * Use Case: Deletar um pagamento
 * Responsabilidade: reverter alocações e remover pagamento
 */
@Injectable()
export class DeletePaymentUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly balanceManager: InstallmentBalanceManager,
    private readonly cacheService: CacheService
  ) {}

  async execute(id: string, organizationId: string) {
    const result = await this.paymentsRepository.transaction(async tx => {
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
      for (const allocation of payment.allocations) {
        if (allocation.payableInstallmentId) {
          await this.balanceManager.reversePayableInstallmentBalance(
            tx,
            allocation.payableInstallmentId,
            Number(allocation.amount)
          );
        } else if (allocation.receivableInstallmentId) {
          await this.balanceManager.reverseReceivableInstallmentBalance(
            tx,
            allocation.receivableInstallmentId,
            Number(allocation.amount)
          );
        }
      }

      // Deletar pagamento
      await tx.payment.delete({ where: { id } });

      return payment;
    });

    // Invalidar cache
    this.cacheService.del(`dashboard:summary:${organizationId}`);

    return result;
  }
}
