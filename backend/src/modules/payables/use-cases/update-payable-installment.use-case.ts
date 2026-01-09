import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { AccountStatus } from '@prisma/client';
import { CacheService } from '../../../shared/services/cache.service';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { UpdateInstallmentDto } from '../dto/payable.dto';
import { PayableStatus } from '../domain/payable-status.enum';

/**
 * Use Case: Atualizar Parcela de Payable
 * Responsabilidade: Atualizar valor de parcela pendente
 */
@Injectable()
export class UpdatePayableInstallmentUseCase {
  constructor(
    private readonly repository: PayablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    organizationId: string,
    updateDto: UpdateInstallmentDto
  ) {
    const payable = await this.repository.findFirst(
      { id: payableId, organizationId },
      {
        installments: {
          include: {
            allocations: true,
          },
        },
      }
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Type assertion necessária porque Prisma não infere includes automaticamente
    const payableWithInstallments = payable as typeof payable & {
      installments: Array<{
        id: string;
        status: AccountStatus;
        allocations: any[];
      }>;
    };

    const installmentToUpdate = payableWithInstallments.installments.find(
      inst => inst.id === installmentId
    );

    if (!installmentToUpdate) {
      throw new NotFoundException('Parcela não encontrada');
    }

    if (installmentToUpdate.status !== PayableStatus.PENDING) {
      throw new BadRequestException('Só é possível editar parcelas pendentes');
    }

    if (installmentToUpdate.allocations.length > 0) {
      throw new BadRequestException(
        'Não é possível editar parcela com pagamentos registrados'
      );
    }

    // Atualizar parcela e recalcular total somando todas as parcelas (auto-corretivo)
    await this.repository.transaction(async prisma => {
      // 1. Atualizar valor da parcela
      await prisma.payableInstallment.update({
        where: { id: installmentId },
        data: {
          amount: MoneyUtils.toDecimal(updateDto.amount),
        },
      });

      // 2. Buscar todas as parcelas atualizadas
      const allInstallments = await prisma.payableInstallment.findMany({
        where: { payableId },
      });

      // 3. Recalcular valor total somando todas as parcelas
      const newTotalAmount = allInstallments.reduce(
        (sum, inst) => sum + Number(inst.amount),
        0
      );

      // 4. Atualizar payable com novo total
      await prisma.payable.update({
        where: { id: payableId },
        data: {
          amount: MoneyUtils.toDecimal(newTotalAmount),
        },
      });
    });

    this.invalidateDashboardCache(organizationId);

    return this.repository.findFirst(
      { id: payableId, organizationId },
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
