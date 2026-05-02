import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateInstallmentItemDto } from '../dto/payable.dto';
import { PayablesRepository } from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { ListPayableInstallmentItemsUseCase } from './list-payable-installment-items.use-case';

@Injectable()
export class CreatePayableInstallmentItemUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly listPayableInstallmentItemsUseCase: ListPayableInstallmentItemsUseCase
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    organizationId: string | undefined,
    dto: CreateInstallmentItemDto
  ) {
    const normalizedDescription = dto.description.trim();
    if (!normalizedDescription) {
      throw new BadRequestException('Descrição do item é obrigatória');
    }

    const normalizedTagIds = this.normalizeTagIds(dto.tagIds);

    await this.payablesRepository.transaction(async prisma => {
      const installment = await this.ensureInstallmentExists(
        prisma,
        payableId,
        installmentId,
        organizationId
      );

      const resolvedOrganizationId = installment.organizationId;

      await this.ensureTagsBelongToOrganization(
        prisma,
        resolvedOrganizationId,
        normalizedTagIds
      );

      const currentItemsTotal = await this.getItemsTotal(
        prisma,
        installmentId,
        resolvedOrganizationId
      );

      const nextItemsTotal = this.roundMoney(
        currentItemsTotal + Number(dto.amount)
      );
      if (nextItemsTotal > Number(installment.amount)) {
        throw new BadRequestException(
          'A soma dos itens da parcela não pode ser maior que o valor da parcela'
        );
      }

      const sortOrder =
        dto.sortOrder ??
        (await this.getNextSortOrder(
          prisma,
          installmentId,
          resolvedOrganizationId
        ));

      const createdItem = await prisma.payableInstallmentItem.create({
        data: {
          organizationId: resolvedOrganizationId,
          payableInstallmentId: installmentId,
          description: normalizedDescription,
          amount: MoneyUtils.toDecimal(dto.amount),
          sortOrder,
        },
      });

      if (normalizedTagIds.length > 0) {
        await prisma.payableInstallmentItemTag.createMany({
          data: normalizedTagIds.map(tagId => ({
            payableInstallmentItemId: createdItem.id,
            tagId,
          })),
        });
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

  private async getItemsTotal(
    prisma: Prisma.TransactionClient,
    installmentId: string,
    organizationId: string
  ): Promise<number> {
    const aggregate = await prisma.payableInstallmentItem.aggregate({
      where: {
        payableInstallmentId: installmentId,
        organizationId,
      },
      _sum: {
        amount: true,
      },
    });

    return Number(aggregate._sum.amount || 0);
  }

  private async getNextSortOrder(
    prisma: Prisma.TransactionClient,
    installmentId: string,
    organizationId: string
  ): Promise<number> {
    const lastItem = await prisma.payableInstallmentItem.findFirst({
      where: {
        payableInstallmentId: installmentId,
        organizationId,
      },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { sortOrder: true },
    });

    return (lastItem?.sortOrder ?? 0) + 1;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
