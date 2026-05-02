import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface InstallmentItemRaw {
  id: string;
  description: string;
  amount: unknown;
  sortOrder: number;
  createdAt: Date;
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

@Injectable()
export class InstallmentItemsReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findItemsByTagIds(
    organizationId: string,
    tagIds: string[],
    skip: number,
    take: number
  ): Promise<{ data: InstallmentItemRaw[]; total: number }> {
    const where = {
      organizationId,
      tags: {
        some: {
          tagId: { in: tagIds },
        },
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payableInstallmentItem.findMany({
        where,
        include: {
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
        },
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
}
