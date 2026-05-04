import { Injectable, NotFoundException } from '@nestjs/common';
import { PayablesRepository } from '../repositories';
import { InstallmentItemHelpersService } from '../services/installment-item-helpers.service';
import { ListPayableInstallmentItemsUseCase } from './list-payable-installment-items.use-case';

@Injectable()
export class DeletePayableInstallmentItemUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly helpers: InstallmentItemHelpersService,
    private readonly listPayableInstallmentItemsUseCase: ListPayableInstallmentItemsUseCase
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    itemId: string,
    organizationId: string | undefined
  ) {
    await this.payablesRepository.transaction(async prisma => {
      const installment = await this.helpers.ensureInstallmentExists(
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
          splitGroupId: true,
          splitTotal: true,
        },
      });

      if (!existingItem) {
        throw new NotFoundException('Item da parcela não encontrado');
      }

      const isSplitGroup = this.helpers.isSplitGroup(existingItem);

      if (isSplitGroup) {
        await prisma.payableInstallmentItem.deleteMany({
          where: {
            splitGroupId: existingItem.splitGroupId!,
            organizationId: resolvedOrganizationId,
          },
        });
      } else {
        await prisma.payableInstallmentItem.delete({
          where: { id: existingItem.id },
        });
      }
    });

    return this.listPayableInstallmentItemsUseCase.execute(
      payableId,
      installmentId,
      organizationId
    );
  }
}
