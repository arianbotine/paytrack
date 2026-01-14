import { Injectable, NotFoundException } from '@nestjs/common';
import { ReceivablesRepository } from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Use Case: Excluir Receivable
 * Responsabilidade: Orquestrar exclusão com validações
 */
@Injectable()
export class DeleteReceivableUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    // Buscar receivable com parcelas e allocations
    const receivable = (await this.repository.findFirst(
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
      }
    )) as any; // Prisma dynamic include

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Coletar IDs únicos dos payments relacionados antes da exclusão
    const relatedPaymentIds = new Set<string>();
    receivable.installments.forEach((installment: any) => {
      installment.allocations.forEach((allocation: any) => {
        relatedPaymentIds.add(allocation.payment.id);
      });
    });

    // Excluir (cascade deleta parcelas automaticamente)
    await this.repository.delete({ id });

    // Limpar payments órfãos (que não têm mais allocations)
    if (relatedPaymentIds.size > 0) {
      await this.cleanupOrphanedPayments(Array.from(relatedPaymentIds));
    }

    // Invalidar cache
    this.cacheService?.del(`dashboard:summary:${organizationId}`);
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
