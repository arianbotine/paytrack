import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayablesRepository } from '../repositories';
import { ListPayableInstallmentItemsUseCase } from './list-payable-installment-items.use-case';

@Injectable()
export class DeletePayableInstallmentItemUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly listPayableInstallmentItemsUseCase: ListPayableInstallmentItemsUseCase
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    itemId: string,
    organizationId: string | undefined
  ) {
    await this.payablesRepository.transaction(async prisma => {
      const installment = await this.ensureInstallmentExists(
        prisma,
        payableId,
        installmentId,
        organizationId
      );

      const resolvedOrganizationId = installment.organizationId;

      const existingItem = await prisma.payableInstallmentItem.findFirst({
        where: {
          id: itemId,
          payableInstallmentId: installmentId,
          organizationId: resolvedOrganizationId,
        },
        select: {
          id: true,
        },
      });

      if (!existingItem) {
        throw new NotFoundException('Item da parcela não encontrado');
      }

      await prisma.payableInstallmentItem.delete({
        where: { id: existingItem.id },
      });
    });

    return this.listPayableInstallmentItemsUseCase.execute(
      payableId,
      installmentId,
      organizationId
    );
  }

  private async ensureInstallmentExists(
    prisma: Prisma.TransactionClient,
    payableId: string,
    installmentId: string,
    organizationId?: string
  ) {
    const installmentWhere = {
      id: installmentId,
      payableId,
      ...(organizationId ? { organizationId } : {}),
    };

    const installment = await prisma.payableInstallment.findFirst({
      where: installmentWhere,
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!installment) {
      throw new NotFoundException('Parcela não encontrada');
    }

    return installment;
  }
}
