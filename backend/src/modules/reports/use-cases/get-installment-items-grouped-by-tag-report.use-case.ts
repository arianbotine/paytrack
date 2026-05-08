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
    const [all, tagRows] = await Promise.all([
      this.repository.findAllItemsByTagIds(organizationId, filters.tagIds),
      this.repository.findTagsByIds(organizationId, filters.tagIds),
    ]);

    // Build a lookup of tagId -> tag metadata from the DB (covers tags with zero items)
    const tagMeta = new Map<
      string,
      { id: string; name: string; color: string | null }
    >();
    for (const t of tagRows) {
      tagMeta.set(t.id, t);
    }

    // For each searched tag, accumulate totals
    const result: InstallmentItemTagGroupSummaryDto[] = filters.tagIds.map(
      tagId => {
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
      }
    );

    // Sort by totalAmount descending
    result.sort((a, b) => b.totalAmount - a.totalAmount);

    return { data: result };
  }
}
