import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UpdateInstallmentItemDto } from '../dto/payable.dto';
import { PayablesRepository } from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { InstallmentItemHelpersService } from '../services/installment-item-helpers.service';
import { ListPayableInstallmentItemsUseCase } from './list-payable-installment-items.use-case';

@Injectable()
export class UpdatePayableInstallmentItemUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly helpers: InstallmentItemHelpersService,
    private readonly listPayableInstallmentItemsUseCase: ListPayableInstallmentItemsUseCase
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    itemId: string,
    organizationId: string | undefined,
    dto: UpdateInstallmentItemDto
  ) {
    const normalizedTagIds =
      dto.tagIds !== undefined
        ? this.helpers.normalizeTagIds(dto.tagIds)
        : undefined;

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
          amount: true,
          splitGroupId: true,
          splitTotal: true,
        },
      });

      if (!existingItem) {
        throw new NotFoundException('Item da parcela não encontrado');
      }

      const isSplitGroup = this.helpers.isSplitGroup(existingItem);

      if (isSplitGroup) {
        // ── Propagate changes to all siblings of the split group ──────────
        const siblings = await prisma.payableInstallmentItem.findMany({
          where: {
            splitGroupId: existingItem.splitGroupId!,
            organizationId: resolvedOrganizationId,
          },
          select: { id: true },
        });

        const updateData: Prisma.PayableInstallmentItemUpdateInput = {};

        if (dto.description !== undefined) {
          const normalizedDescription = dto.description.trim();
          if (!normalizedDescription) {
            throw new BadRequestException('Descrição do item é obrigatória');
          }
          updateData.description = normalizedDescription;
        }

        if (dto.amount !== undefined) {
          updateData.amount = MoneyUtils.toDecimal(dto.amount);
        }

        if (dto.sortOrder !== undefined) {
          updateData.sortOrder = dto.sortOrder;
        }

        for (const sibling of siblings) {
          await prisma.payableInstallmentItem.update({
            where: { id: sibling.id },
            data: updateData,
          });

          if (normalizedTagIds !== undefined) {
            await this.helpers.replaceItemTags(
              prisma,
              sibling.id,
              normalizedTagIds
            );
          }
        }
      } else {
        // ── Original single-item update ────────────────────────────────────
        if (normalizedTagIds !== undefined) {
          await this.helpers.ensureTagsBelongToOrganization(
            prisma,
            resolvedOrganizationId,
            normalizedTagIds
          );
        }

        if (dto.amount !== undefined) {
          const otherItemsTotal =
            await this.helpers.getItemsTotalExcludingCurrentItem(
              prisma,
              installmentId,
              resolvedOrganizationId,
              itemId
            );

          const nextItemsTotal = this.helpers.roundMoney(
            otherItemsTotal + Number(dto.amount)
          );
          if (nextItemsTotal > Number(installment.amount)) {
            throw new BadRequestException(
              'A soma dos itens da parcela não pode ser maior que o valor da parcela'
            );
          }
        }

        const updateData: Prisma.PayableInstallmentItemUpdateInput = {};

        if (dto.description !== undefined) {
          const normalizedDescription = dto.description.trim();
          if (!normalizedDescription) {
            throw new BadRequestException('Descrição do item é obrigatória');
          }
          updateData.description = normalizedDescription;
        }

        if (dto.amount !== undefined) {
          updateData.amount = MoneyUtils.toDecimal(dto.amount);
        }

        if (dto.sortOrder !== undefined) {
          updateData.sortOrder = dto.sortOrder;
        }

        await prisma.payableInstallmentItem.update({
          where: { id: existingItem.id },
          data: updateData,
        });

        if (normalizedTagIds !== undefined) {
          await this.helpers.replaceItemTags(
            prisma,
            existingItem.id,
            normalizedTagIds
          );
        }
      }
    });

    return this.listPayableInstallmentItemsUseCase.execute(
      payableId,
      installmentId,
      organizationId
    );
  }
}
