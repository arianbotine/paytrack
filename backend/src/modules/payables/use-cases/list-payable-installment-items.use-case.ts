import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PayableInstallmentsRepository,
  PayableInstallmentItemsRepository,
} from '../repositories';

@Injectable()
export class ListPayableInstallmentItemsUseCase {
  constructor(
    private readonly payableInstallmentsRepository: PayableInstallmentsRepository,
    private readonly payableInstallmentItemsRepository: PayableInstallmentItemsRepository
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    organizationId?: string
  ) {
    type InstallmentItemWithTags = Prisma.PayableInstallmentItemGetPayload<{
      include: {
        tags: {
          include: {
            tag: {
              select: {
                id: true;
                name: true;
                color: true;
              };
            };
          };
        };
      };
    }>;

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
    )) as InstallmentItemWithTags[];

    const normalizedItems = items.map(item => ({
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
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
        installmentAmount: this.roundMoney(installmentAmount),
        itemsTotal: this.roundMoney(itemsTotal),
        remainingAmountForItems: this.roundMoney(
          installmentAmount - itemsTotal
        ),
      },
    };
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
