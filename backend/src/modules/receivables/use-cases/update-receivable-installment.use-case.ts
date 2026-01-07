import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReceivablesRepository } from '../repositories';
import { AccountStatus } from '@prisma/client';
import { CacheService } from '../../../shared/services/cache.service';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { UpdateInstallmentDto } from '../dto/receivable.dto';

/**
 * Use Case: Atualizar Parcela de Receivable
 * Responsabilidade: Atualizar valor de parcela pendente
 */
@Injectable()
export class UpdateReceivableInstallmentUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(
    receivableId: string,
    installmentId: string,
    organizationId: string,
    updateDto: UpdateInstallmentDto
  ) {
    const receivable = await this.repository.findFirst(
      { id: receivableId, organizationId },
      {
        installments: {
          include: {
            allocations: true,
          },
        },
      }
    );

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Type assertion necessária porque Prisma não infere includes automaticamente
    const receivableWithInstallments = receivable as typeof receivable & {
      installments: Array<{
        id: string;
        status: AccountStatus;
        allocations: any[];
      }>;
    };

    const installmentToUpdate = receivableWithInstallments.installments.find(
      inst => inst.id === installmentId
    );

    if (!installmentToUpdate) {
      throw new NotFoundException('Parcela não encontrada');
    }

    if (installmentToUpdate.status !== AccountStatus.PENDING) {
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
      await prisma.receivableInstallment.update({
        where: { id: installmentId },
        data: {
          amount: MoneyUtils.toDecimal(updateDto.amount),
        },
      });

      // 2. Buscar todas as parcelas atualizadas
      const allInstallments = await prisma.receivableInstallment.findMany({
        where: { receivableId },
      });

      // 3. Recalcular valor total somando todas as parcelas
      const newTotalAmount = allInstallments.reduce(
        (sum, inst) => sum + Number(inst.amount),
        0
      );

      // 4. Atualizar receivable com novo total
      await prisma.receivable.update({
        where: { id: receivableId },
        data: {
          amount: MoneyUtils.toDecimal(newTotalAmount),
        },
      });
    });

    this.invalidateDashboardCache(organizationId);

    return this.repository.findFirst(
      { id: receivableId, organizationId },
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
    const cacheKey = `dashboard:${organizationId}`;
    this.cacheService.del(cacheKey);
  }
}
