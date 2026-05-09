import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface InstallmentItemRaw {
  id: string;
  description: string;
  amount: unknown;
  sortOrder: number;
  splitIndex: number | null;
  splitTotal: number | null;
  createdAt: Date;
  category: { id: string; name: string; color: string | null } | null;
  tags: Array<{
    tag: { id: string; name: string; color: string | null };
  }>;
  payableInstallment: {
    id: string;
    installmentNumber: number;
    totalInstallments: number;
    amount: unknown;
    paidAmount: unknown;
    dueDate: Date;
    status: string;
    notes: string | null;
    payable: {
      id: string;
      createdAt: Date;
      notes: string | null;
      vendor: { name: string };
      category: { name: string } | null;
    };
  };
}

interface ItemFilters {
  tagIds?: string[];
  categoryIds?: string[];
}

@Injectable()
export class InstallmentItemsReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(organizationId: string, filters: ItemFilters) {
    const where: Record<string, unknown> = { organizationId };

    if (filters.tagIds && filters.tagIds.length > 0) {
      where['tags'] = { some: { tagId: { in: filters.tagIds } } };
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      where['categoryId'] = { in: filters.categoryIds };
    }

    return where;
  }

  private get itemInclude() {
    return {
      category: { select: { id: true, name: true, color: true } },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      payableInstallment: {
        include: {
          payable: {
            include: {
              vendor: { select: { name: true } },
              category: { select: { name: true } },
            },
          },
        },
      },
    };
  }

  async findItemsByFilters(
    organizationId: string,
    filters: ItemFilters,
    skip: number,
    take: number
  ): Promise<{ data: InstallmentItemRaw[]; total: number }> {
    const where = this.buildWhere(organizationId, filters);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payableInstallmentItem.findMany({
        where,
        include: this.itemInclude,
        orderBy: [
          { payableInstallment: { dueDate: 'asc' } },
          { sortOrder: 'asc' },
        ],
        skip,
        take,
      }),
      this.prisma.payableInstallmentItem.count({ where }),
    ]);

    return { data: data as unknown as InstallmentItemRaw[], total };
  }

  async findAllItemsByFilters(
    organizationId: string,
    filters: ItemFilters
  ): Promise<InstallmentItemRaw[]> {
    const where = this.buildWhere(organizationId, filters);

    const data = await this.prisma.payableInstallmentItem.findMany({
      where,
      include: this.itemInclude,
      orderBy: [
        { payableInstallment: { dueDate: 'asc' } },
        { sortOrder: 'asc' },
      ],
    });

    return data as unknown as InstallmentItemRaw[];
  }

  async findTagsByIds(
    organizationId: string,
    tagIds: string[]
  ): Promise<Array<{ id: string; name: string; color: string | null }>> {
    return this.prisma.tag.findMany({
      where: { id: { in: tagIds }, organizationId },
      select: { id: true, name: true, color: true },
    });
  }
}
