import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class InstallmentItemHelpersService {
  // ─── Pure helpers ──────────────────────────────────────────────────────────

  normalizeTagIds(tagIds?: string[]): string[] {
    if (!tagIds || tagIds.length === 0) return [];
    return [...new Set(tagIds)];
  }

  roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  isSplitGroup(item: {
    splitGroupId?: string | null;
    splitTotal?: number | null;
  }): boolean {
    return item.splitGroupId != null && (item.splitTotal ?? 1) > 1;
  }

  // ─── Prisma-aware helpers (run inside transactions) ────────────────────────

  async ensureInstallmentExists(
    prisma: Prisma.TransactionClient,
    payableId: string,
    installmentId: string,
    organizationId?: string
  ) {
    const installment = await prisma.payableInstallment.findFirst({
      where: {
        id: installmentId,
        payableId,
        ...(organizationId ? { organizationId } : {}),
      },
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

  async ensureTagsBelongToOrganization(
    prisma: Prisma.TransactionClient,
    organizationId: string,
    tagIds: string[]
  ): Promise<void> {
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

  async getItemsTotal(
    prisma: Prisma.TransactionClient,
    installmentId: string,
    organizationId: string
  ): Promise<number> {
    const aggregate = await prisma.payableInstallmentItem.aggregate({
      where: {
        payableInstallmentId: installmentId,
        organizationId,
      },
      _sum: { amount: true },
    });

    return Number(aggregate._sum.amount || 0);
  }

  async getItemsTotalExcludingCurrentItem(
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
      _sum: { amount: true },
    });

    return Number(aggregate._sum.amount || 0);
  }

  async getNextSortOrder(
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

  async replaceItemTags(
    prisma: Prisma.TransactionClient,
    itemId: string,
    tagIds: string[]
  ): Promise<void> {
    await prisma.payableInstallmentItemTag.deleteMany({
      where: { payableInstallmentItemId: itemId },
    });

    if (tagIds.length > 0) {
      await prisma.payableInstallmentItemTag.createMany({
        data: tagIds.map(tagId => ({
          payableInstallmentItemId: itemId,
          tagId,
        })),
      });
    }
  }
}
