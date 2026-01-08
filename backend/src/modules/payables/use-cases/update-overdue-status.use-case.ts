import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountStatus } from '@prisma/client';
import { getTodayWithoutTime } from '../../../shared/utils/date.utils';

/**
 * Use Case: Atualizar status de parcelas vencidas
 * Responsabilidade: Atualizar parcelas PENDING que estão vencidas para OVERDUE
 */
@Injectable()
export class UpdateOverdueStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    // Data de hoje sem horário (00:00:00)
    // Apenas parcelas com dueDate < hoje (dias anteriores) serão marcadas como OVERDUE
    // Parcelas com vencimento HOJE não são consideradas vencidas
    const today = getTodayWithoutTime();

    const result = await this.prisma.payableInstallment.updateMany({
      where: {
        status: AccountStatus.PENDING,
        dueDate: { lt: today },
      },
      data: { status: AccountStatus.OVERDUE },
    });

    return result;
  }
}
