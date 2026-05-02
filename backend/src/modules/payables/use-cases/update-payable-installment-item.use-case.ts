import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UpdateInstallmentItemDto } from '../dto/payable.dto';
import { PayablesRepository } from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { ListPayableInstallmentItemsUseCase } from './list-payable-installment-items.use-case';

@Injectable()
export class UpdatePayableInstallmentItemUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
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
      dto.tagIds !== undefined ? this.normalizeTagIds(dto.tagIds) : undefined;

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
          amount: true,
        },
      });

      if (!existingItem) {
        throw new NotFoundException('Item da parcela não encontrado');
      }

      if (normalizedTagIds !== undefined) {
        await this.ensureTagsBelongToOrganization(
          prisma,
          resolvedOrganizationId,
          normalizedTagIds
        );
      }

      if (dto.amount !== undefined) {
        const otherItemsTotal = await this.getItemsTotalExcludingCurrentItem(
          prisma,
          installmentId,
          resolvedOrganizationId,
          itemId
        );

        const nextItemsTotal = this.roundMoney(
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
        await prisma.payableInstallmentItemTag.deleteMany({
          where: { payableInstallmentItemId: existingItem.id },
        });

        if (normalizedTagIds.length > 0) {
          await prisma.payableInstallmentItemTag.createMany({
            data: normalizedTagIds.map(tagId => ({
              payableInstallmentItemId: existingItem.id,
              tagId,
            })),
          });
        }
      }
    });

    return this.listPayableInstallmentItemsUseCase.execute(
      payableId,
      installmentId,
      organizationId
    );
  }

  private normalizeTagIds(tagIds?: string[]): string[] {
    if (!tagIds || tagIds.length === 0) return [];
    return [...new Set(tagIds)];
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
        amount: true,
        organizationId: true,
      },
    });

    if (!installment) {
      throw new NotFoundException('Parcela não encontrada');
    }

    return installment;
  }

  private async ensureTagsBelongToOrganization(
    prisma: Prisma.TransactionClient,
    organizationId: string,
    tagIds: string[]
  ) {
    if (tagIds.length === 0) return;

    const validTagsCount = await prisma.tag.count({
      where: {
        organizationId,
        id: { in: tagIds },
      },
    });

    if (validTagsCount !== tagIds.length) {
      throw new BadRequestException(
        'Uma ou mais tags informadas são inválidas para esta organização'
      );
    }
  }

  private async getItemsTotalExcludingCurrentItem(
    prisma: Prisma.TransactionClient,
    installmentId: string,
    organizationId: string,
    itemId: string
  ): Promise<number> {
    const aggregate = await prisma.payableInstallmentItem.aggregate({
      where: {
        payableInstallmentId: installmentId,
        organizationId,
        id: { not: itemId },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(aggregate._sum.amount || 0);
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
