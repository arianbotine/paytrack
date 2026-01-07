import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountStatus } from '@prisma/client';

/**
 * Use Case: Atualizar status de parcelas vencidas
 * Responsabilidade: Atualizar parcelas PENDING que estão vencidas para OVERDUE
 */
@Injectable()
export class UpdateOverdueStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    // Usar data atual em UTC para evitar problemas de timezone
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

    const result = await this.prisma.payableInstallment.updateMany({
      where: {
        status: AccountStatus.PENDING,
        dueDate: { lt: todayUTC },
      },
      data: { status: AccountStatus.OVERDUE },
    });

    return result;
  }
}
