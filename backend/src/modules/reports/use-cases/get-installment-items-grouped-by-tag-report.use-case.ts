import { Injectable } from '@nestjs/common';
import { InstallmentItemsReportRepository } from '../repositories';
import {
  InstallmentItemsReportFilterDto,
  InstallmentItemTagGroupSummaryDto,
  InstallmentItemsGroupedByTagResponseDto,
} from '../dto';

@Injectable()
export class GetInstallmentItemsGroupedByTagReportUseCase {
  constructor(private readonly repository: InstallmentItemsReportRepository) {}

  async execute(
    organizationId: string,
    filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsGroupedByTagResponseDto> {
    const hasExplicitTags = filters.tagIds && filters.tagIds.length > 0;

    const all = await this.repository.findAllItemsByFilters(organizationId, {
      tagIds: filters.tagIds,
      categoryIds: filters.categoryIds,
    });

    // Build tag metadata: either from explicit tagIds (with DB lookup to cover
    // tags with zero items) or derived from the items themselves.
    const tagMeta = new Map<
      string,
      { id: string; name: string; color: string | null }
    >();

    if (hasExplicitTags) {
      const tagRows = await this.repository.findTagsByIds(
        organizationId,
        filters.tagIds!
      );
      for (const t of tagRows) {
        tagMeta.set(t.id, t);
      }
    } else {
      // Derive tags from the filtered items
      for (const item of all) {
        for (const t of item.tags) {
          if (!tagMeta.has(t.tag.id)) {
            tagMeta.set(t.tag.id, {
              id: t.tag.id,
              name: t.tag.name,
              color: t.tag.color ?? null,
            });
          }
        }
      }
    }

    const tagIds = hasExplicitTags
      ? filters.tagIds!
      : Array.from(tagMeta.keys());

    const result: InstallmentItemTagGroupSummaryDto[] = tagIds.map(tagId => {
      const meta = tagMeta.get(tagId);
      const itemsForTag = all.filter(item =>
        item.tags.some(t => t.tag.id === tagId)
      );

      return {
        tagId,
        tagName: meta?.name ?? tagId,
        tagColor: meta?.color ?? null,
        totalAmount: itemsForTag.reduce(
          (sum, item) => sum + Number(item.amount),
          0
        ),
        itemCount: itemsForTag.length,
        installmentCount: new Set(
          itemsForTag.map(item => item.payableInstallment.id)
        ).size,
        payableCount: new Set(
          itemsForTag.map(item => item.payableInstallment.payable.id)
        ).size,
      };
    });

    result.sort((a, b) => b.totalAmount - a.totalAmount);

    return { data: result };
  }
}
