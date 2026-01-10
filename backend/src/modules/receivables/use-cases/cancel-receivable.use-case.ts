import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReceivablesRepository } from '../repositories';
import { AccountStatus } from '@prisma/client';
import { CacheService } from '../../../shared/services/cache.service';

/**
 * Use Case: Cancelar Receivable
 * Responsabilidade: Cancelar conta a receber e suas parcelas
 */
@Injectable()
export class CancelReceivableUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(id: string, organizationId: string) {
    const receivable = await this.repository.findFirst(
      { id, organizationId },
      { installments: true }
    );

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    if (receivable.status === AccountStatus.CANCELLED) {
      throw new BadRequestException('Conta já está cancelada');
    }

    // Type assertion necessária porque Prisma não infere includes automaticamente
    const receivableWithInstallments = receivable as typeof receivable & {
      installments: Array<{ receivedAmount: any }>;
    };

    const hasPayments = receivableWithInstallments.installments.some(
      inst => Number(inst.receivedAmount) > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível cancelar conta com parcelas recebidas'
      );
    }

    await this.repository.transaction(async prisma => {
      await prisma.receivable.update({
        where: { id },
        data: { status: AccountStatus.CANCELLED },
      });

      await prisma.receivableInstallment.updateMany({
        where: { receivableId: id },
        data: { status: AccountStatus.CANCELLED },
      });
    });

    this.invalidateDashboardCache(organizationId);

    return this.repository.findFirst(
      { id, organizationId },
      {
        customer: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      }
    );
  }

  private invalidateDashboardCache(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`;
    this.cacheService.del(cacheKey);
  }
}
