import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PayableInstallmentsRepository,
  PayableInstallmentItemsRepository,
} from '../repositories';
import { InstallmentItemHelpersService } from '../services/installment-item-helpers.service';

type InstallmentItemWithTags = {
  id: string;
  description: string;
  amount: { toFixed: (d: number) => string } & object;
  sortOrder: number;
  splitIndex: number | null;
  splitTotal: number | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; color: string | null } | null;
  tags: Array<{
    tag: { id: string; name: string; color: string | null };
  }>;
};

@Injectable()
export class ListPayableInstallmentItemsUseCase {
  constructor(
    private readonly payableInstallmentsRepository: PayableInstallmentsRepository,
    private readonly payableInstallmentItemsRepository: PayableInstallmentItemsRepository,
    private readonly helpers: InstallmentItemHelpersService
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    organizationId?: string
  ) {
    const installmentWhere = {
      id: installmentId,
      payableId,
      ...(organizationId ? { organizationId } : {}),
    };

    const installment = await this.payableInstallmentsRepository.findFirst(
      installmentWhere,
      {
        select: {
          id: true,
          amount: true,
          organizationId: true,
        },
      }
    );

    if (!installment) {
      throw new NotFoundException('Parcela não encontrada');
    }

    const resolvedOrganizationId = installment.organizationId;

    const items = (await this.payableInstallmentItemsRepository.findMany(
      {
        payableInstallmentId: installmentId,
        organizationId: resolvedOrganizationId,
      },
      {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }
    )) as unknown as InstallmentItemWithTags[];

    const normalizedItems = items.map(item => ({
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      sortOrder: item.sortOrder,
      splitIndex: item.splitIndex ?? null,
      splitTotal: item.splitTotal ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      category: item.category
        ? { id: item.category.id, name: item.category.name, color: item.category.color }
        : null,
      tags: item.tags.map(itemTag => ({
        id: itemTag.tag.id,
        name: itemTag.tag.name,
        color: itemTag.tag.color,
      })),
    }));

    const installmentAmount = Number(installment.amount);
    const itemsTotal = normalizedItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    return {
      data: normalizedItems,
      summary: {
        installmentAmount: this.helpers.roundMoney(installmentAmount),
        itemsTotal: this.helpers.roundMoney(itemsTotal),
        remainingAmountForItems: this.helpers.roundMoney(
          installmentAmount - itemsTotal
        ),
      },
    };
  }
}
