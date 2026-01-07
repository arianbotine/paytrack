import { Injectable, BadRequestException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PayableInstallmentsRepository } from '../repositories';
import { InstallmentsCalculator } from './installments-calculator.service';

/**
 * Serviço de domínio responsável por gerenciar parcelas de payables
 * Centraliza lógica de recalcular e atualizar parcelas
 */
@Injectable()
export class PayableInstallmentsManager {
  constructor(
    private readonly installmentsRepository: PayableInstallmentsRepository,
    private readonly calculator: InstallmentsCalculator
  ) {}

  /**
   * Recalcula as parcelas quando o valor total é alterado
   */
  async recalculateInstallments(
    payableId: string,
    organizationId: string,
    newAmount: number,
    installmentCount: number,
    existingDueDates: string[]
  ): Promise<void> {
    // Deletar parcelas antigas
    await this.installmentsRepository.deleteMany({ payableId });

    // Criar novas parcelas com valores recalculados
    const newInstallments = this.calculator.generateInstallments(
      newAmount,
      installmentCount,
      existingDueDates,
      payableId,
      organizationId,
      'payable'
    );

    await this.installmentsRepository.createMany(newInstallments as any);
  }

  /**
   * Atualiza as datas de vencimento das parcelas
   */
  async updateInstallmentDates(
    payableId: string,
    newDueDate: Date,
    installments: any[]
  ): Promise<void> {
    const installmentCount = installments.length;
    const newDueDates = this.calculator.calculateMonthlyDueDates(
      newDueDate,
      installmentCount
    );

    // Atualizar apenas parcelas pendentes ou vencidas
    const installmentsToUpdate = installments.filter(
      installment =>
        installment.status === AccountStatus.PENDING ||
        installment.status === AccountStatus.OVERDUE
    );

    await Promise.all(
      installmentsToUpdate.map(installment => {
        const originalIndex = installments.findIndex(
          inst => inst.id === installment.id
        );
        return this.installmentsRepository.update(
          { id: installment.id },
          { dueDate: newDueDates[originalIndex] }
        );
      })
    );
  }

  /**
   * Valida se uma parcela existe e pertence à organização
   */
  async validateInstallmentOwnership(
    installmentId: string,
    organizationId: string
  ): Promise<boolean> {
    const installment = (await this.installmentsRepository.findUnique(
      { id: installmentId },
      { payable: { select: { id: true, organizationId: true } } }
    )) as any;

    if (!installment?.payable) {
      throw new BadRequestException('Parcela não encontrada');
    }

    if (installment.payable.organizationId !== organizationId) {
      throw new BadRequestException('Parcela não pertence a esta organização');
    }

    return true;
  }
}
