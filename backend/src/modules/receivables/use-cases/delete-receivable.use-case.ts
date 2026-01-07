import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReceivablesRepository } from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';

/**
 * Use Case: Excluir Receivable
 * Responsabilidade: Orquestrar exclusão com validações
 */
@Injectable()
export class DeleteReceivableUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    // Buscar receivable com parcelas e allocations
    const receivable = (await this.repository.findFirst(
      { id, organizationId },
      {
        installments: {
          include: { allocations: true },
        },
      }
    )) as any; // Prisma dynamic include

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Validar se tem recebimentos
    const hasPayments = receivable.installments.some(
      (i: any) => i.allocations.length > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível excluir conta com recebimentos registrados'
      );
    }

    // Excluir (cascade deleta parcelas automaticamente)
    await this.repository.delete({ id });

    // Invalidar cache
    this.cacheService?.del(`dashboard:summary:${organizationId}`);
  }
}
