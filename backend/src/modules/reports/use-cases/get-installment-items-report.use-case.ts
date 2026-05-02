import { Injectable } from '@nestjs/common';
import { InstallmentItemsReportRepository } from '../repositories';
import {
  InstallmentItemsReportFilterDto,
  InstallmentItemReportRowDto,
  InstallmentItemsReportSummaryDto,
  InstallmentItemsReportResponseDto,
  InstallmentItemTagDto,
} from '../dto';

@Injectable()
export class GetInstallmentItemsReportUseCase {
  constructor(private readonly repository: InstallmentItemsReportRepository) {}

  async execute(
    organizationId: string,
    filters: InstallmentItemsReportFilterDto
  ): Promise<InstallmentItemsReportResponseDto> {
    const skip = filters.skip ?? 0;
    const take = filters.take ?? 50;

    const { data, total } = await this.repository.findItemsByTagIds(
      organizationId,
      filters.tagIds,
      skip,
      take
    );

    const rows: InstallmentItemReportRowDto[] = data.map(item => {
      const tags: InstallmentItemTagDto[] = item.tags.map(t => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color ?? null,
      }));

      const inst = item.payableInstallment;
      const pay = inst.payable;

      return {
        itemId: item.id,
        itemDescription: item.description,
        itemAmount: Number(item.amount),
        itemSortOrder: item.sortOrder,
        itemCreatedAt: item.createdAt.toISOString(),
        tags,
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        totalInstallments: inst.totalInstallments,
        installmentAmount: Number(inst.amount),
        installmentDueDate: inst.dueDate.toISOString(),
        installmentStatus: inst.status,
        installmentPaidAmount: Number(inst.paidAmount),
        installmentNotes: inst.notes ?? null,
        payableId: pay.id,
        vendorName: pay.vendor.name,
        categoryName: pay.category?.name ?? null,
        payableCreatedAt: pay.createdAt.toISOString(),
        payableNotes: pay.notes ?? null,
      };
    });

    const summary: InstallmentItemsReportSummaryDto = {
      totalItems: total,
      totalAmount: rows.reduce((sum, r) => sum + r.itemAmount, 0),
      uniqueInstallments: new Set(rows.map(r => r.installmentId)).size,
      uniquePayables: new Set(rows.map(r => r.payableId)).size,
    };

    return { data: rows, total, summary };
  }
}
