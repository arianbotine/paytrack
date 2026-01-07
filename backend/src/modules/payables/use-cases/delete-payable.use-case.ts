import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';
import { AccountStatus } from '@prisma/client';

/**
 * Use Case: Deletar uma conta a pagar
 * Responsabilidade: validar e remover conta com suas dependências
 */
@Injectable()
export class DeletePayableUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(id: string, organizationId: string) {
    const payable = await this.payablesRepository.findFirst(
      { id, organizationId },
      {
        installments: {
          select: {
            status: true,
          },
        },
      } as any
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Validar se possui pagamentos
    const hasPayments = (payable as any).installments.some(
      (inst: any) =>
        inst.status === AccountStatus.PAID ||
        inst.status === AccountStatus.PARTIAL
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível excluir uma conta que possui pagamentos registrados'
      );
    }

    // Deletar (cascade irá remover parcelas e tags automaticamente)
    await this.payablesRepository.delete({ id });

    // Invalidar cache
    this.cacheService.del(`dashboard:summary:${organizationId}`);

    return payable;
  }
}
