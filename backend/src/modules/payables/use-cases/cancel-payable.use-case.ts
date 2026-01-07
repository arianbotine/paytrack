import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { AccountStatus } from '@prisma/client';
import { CacheService } from '../../../shared/services/cache.service';

/**
 * Use Case: Cancelar Payable
 * Responsabilidade: Cancelar conta a pagar e suas parcelas
 */
@Injectable()
export class CancelPayableUseCase {
  constructor(
    private readonly repository: PayablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(id: string, organizationId: string) {
    const payable = await this.repository.findFirst(
      { id, organizationId },
      { installments: true }
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    if (payable.status === AccountStatus.CANCELLED) {
      throw new BadRequestException('Conta já está cancelada');
    }

    // Type assertion necessária porque Prisma não infere includes automaticamente
    const payableWithInstallments = payable as typeof payable & {
      installments: Array<{ paidAmount: any }>;
    };

    const hasPayments = payableWithInstallments.installments.some(
      inst => Number(inst.paidAmount) > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível cancelar conta com parcelas pagas'
      );
    }

    await this.repository.transaction(async prisma => {
      await prisma.payable.update({
        where: { id },
        data: { status: AccountStatus.CANCELLED },
      });

      await prisma.payableInstallment.updateMany({
        where: { payableId: id },
        data: { status: AccountStatus.CANCELLED },
      });
    });

    this.invalidateDashboardCache(organizationId);

    return this.repository.findFirst(
      { id, organizationId },
      {
        vendor: { select: { id: true, name: true } },
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
    const cacheKey = `dashboard:${organizationId}`;
    this.cacheService.del(cacheKey);
  }
}
