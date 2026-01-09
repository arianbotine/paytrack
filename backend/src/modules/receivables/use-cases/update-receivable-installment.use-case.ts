import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReceivablesRepository } from '../repositories';
import { CacheService } from '../../../shared/services/cache.service';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { UpdateInstallmentDto } from '../dto/receivable.dto';
import { ReceivableStatus } from '../domain/receivable-status.enum';

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
        status: ReceivableStatus;
        allocations: any[];
      }>;
    };

    const installmentToUpdate = receivableWithInstallments.installments.find(
      inst => inst.id === installmentId
    );

    if (!installmentToUpdate) {
      throw new NotFoundException('Parcela não encontrada');
    }

    if (installmentToUpdate.status !== ReceivableStatus.PENDING) {
      throw new BadRequestException('Só é possível editar parcelas pendentes');
    }

    if (installmentToUpdate.allocations.length > 0) {
      throw new BadRequestException(
        'Não é possível editar parcela com pagamentos registrados'
      );
    }

    // Atualizar parcela e recalcular total somando todas as parcelas (auto-corretivo)
    await this.repository.transaction(async prisma => {
      // 1. Atualizar parcela (valor e/ou data de vencimento)
      const updateData: { amount?: any; dueDate?: Date } = {};

      if (updateDto.amount !== undefined) {
        updateData.amount = MoneyUtils.toDecimal(updateDto.amount);
      }

      if (updateDto.dueDate && updateDto.dueDate.trim() !== '') {
        const dateValue = new Date(updateDto.dueDate + 'T12:00:00.000Z');
        if (Number.isNaN(dateValue.getTime())) {
          throw new BadRequestException('Data de vencimento inválida');
        }
        updateData.dueDate = dateValue;
      }

      await prisma.receivableInstallment.update({
        where: { id: installmentId },
        data: updateData,
      });

      // 2. Se alterou a data de vencimento, reordenar e renumerar parcelas
      if (updateDto.dueDate) {
        // Buscar todas as parcelas ordenadas por data de vencimento
        const allInstallments = await prisma.receivableInstallment.findMany({
          where: { receivableId },
          orderBy: { dueDate: 'asc' },
        });

        // Renumerar parcelas de acordo com a ordem de vencimento
        for (let i = 0; i < allInstallments.length; i++) {
          await prisma.receivableInstallment.update({
            where: { id: allInstallments[i].id },
            data: { installmentNumber: i + 1 },
          });
        }
      }

      // 3. Se alterou valor, recalcular total
      if (updateDto.amount !== undefined) {
        // Buscar todas as parcelas atualizadas
        const allInstallments = await prisma.receivableInstallment.findMany({
          where: { receivableId },
        });

        // Recalcular valor total somando todas as parcelas
        const newTotalAmount = allInstallments.reduce(
          (sum, inst) => sum + Number(inst.amount),
          0
        );

        // Atualizar receivable com novo total
        await prisma.receivable.update({
          where: { id: receivableId },
          data: {
            amount: MoneyUtils.toDecimal(newTotalAmount),
          },
        });
      }
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
