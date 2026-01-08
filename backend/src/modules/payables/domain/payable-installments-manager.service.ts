import { Injectable, BadRequestException } from '@nestjs/common';
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
