import { Injectable, NotFoundException } from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Use Case: Deletar uma conta a pagar
 * Responsabilidade: validar e remover conta com suas dependências
 */
@Injectable()
export class DeletePayableUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService
  ) {}

  async execute(id: string, organizationId: string) {
    const payable = await this.payablesRepository.findFirst(
      { id, organizationId },
      {
        installments: {
          include: {
            allocations: {
              include: {
                payment: true,
              },
            },
          },
        },
      } as any
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Coletar IDs únicos dos payments relacionados antes da exclusão
    const relatedPaymentIds = new Set<string>();
    (payable as any).installments.forEach((installment: any) => {
      installment.allocations.forEach((allocation: any) => {
        relatedPaymentIds.add(allocation.payment.id);
      });
    });

    // Deletar (cascade irá remover parcelas, allocations e tags automaticamente)
    await this.payablesRepository.delete({ id });

    // Limpar payments órfãos (que não têm mais allocations)
    if (relatedPaymentIds.size > 0) {
      await this.cleanupOrphanedPayments(Array.from(relatedPaymentIds));
    }

    // Invalidar cache
    this.cacheService.del(`dashboard:summary:${organizationId}`);

    return payable;
  }

  /**
   * Remove payments que não têm mais allocations após exclusão de conta
   */
  private async cleanupOrphanedPayments(paymentIds: string[]) {
    for (const paymentId of paymentIds) {
      // Verificar se o payment ainda tem allocations
      const allocationCount = await this.prisma.paymentAllocation.count({
        where: { paymentId },
      });

      // Se não tem mais allocations, deletar o payment
      if (allocationCount === 0) {
        await this.prisma.payment.delete({
          where: { id: paymentId },
        });
      }
    }
  }
}
