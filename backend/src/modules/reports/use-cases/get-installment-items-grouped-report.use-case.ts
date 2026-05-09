import { Injectable } from '@nestjs/common';
import { InstallmentItemsReportRepository } from '../repositories';
import {
  InstallmentItemsReportFilterDto,
  InstallmentItemGroupedRowDto,
  InstallmentItemsGroupedSummaryDto,
  InstallmentItemsGroupedResponseDto,
  InstallmentItemTagDto,
} from '../dto';

@Injectable()
export class GetInstallmentItemsGroupedReportUseCase {
  constructor(private readonly repository: InstallmentItemsReportRepository) {}

  async execute(
    organizationId: string,
    filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsGroupedResponseDto> {
    const all = await this.repository.findAllItemsByFilters(
      organizationId,
      { tagIds: filters.tagIds, categoryIds: filters.categoryIds }
    );

    const map = new Map<
      string,
      {
        totalAmount: number;
        installmentIds: Set<string>;
        payableIds: Set<string>;
        tagMap: Map<string, InstallmentItemTagDto>;
        itemCount: number;
      }
    >();

    for (const item of all) {
      const key = item.description;
      if (!map.has(key)) {
        map.set(key, {
          totalAmount: 0,
          installmentIds: new Set(),
          payableIds: new Set(),
          tagMap: new Map(),
          itemCount: 0,
        });
      }
      const entry = map.get(key)!;
      entry.totalAmount += Number(item.amount);
      entry.installmentIds.add(item.payableInstallment.id);
      entry.payableIds.add(item.payableInstallment.payable.id);
      entry.itemCount += 1;
      for (const t of item.tags) {
        entry.tagMap.set(t.tag.id, {
          id: t.tag.id,
          name: t.tag.name,
          color: t.tag.color ?? null,
        });
      }
    }

    const data: InstallmentItemGroupedRowDto[] = Array.from(map.entries()).map(
      ([description, entry]) => ({
        description,
        totalAmount: entry.totalAmount,
        itemCount: entry.itemCount,
        installmentCount: entry.installmentIds.size,
        payableCount: entry.payableIds.size,
        tags: Array.from(entry.tagMap.values()),
      })
    );

    data.sort((a, b) => b.totalAmount - a.totalAmount);

    const summary: InstallmentItemsGroupedSummaryDto = {
      totalAmount: data.reduce((s, r) => s + r.totalAmount, 0),
      uniqueDescriptions: data.length,
      uniqueInstallments: new Set(all.map(i => i.payableInstallment.id)).size,
      uniquePayables: new Set(all.map(i => i.payableInstallment.payable.id))
        .size,
    };

    return { data, total: data.length, summary };
  }
}
