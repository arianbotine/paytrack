import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstallmentItemTagDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) color!: string | null;
}

export class InstallmentItemReportRowDto {
  // Item fields
  @ApiProperty() itemId!: string;
  @ApiProperty() itemDescription!: string;
  @ApiProperty() itemAmount!: number;
  @ApiProperty() itemSortOrder!: number;
  @ApiProperty() itemCreatedAt!: string;
  @ApiPropertyOptional({ nullable: true }) itemSplitIndex!: number | null;
  @ApiPropertyOptional({ nullable: true }) itemSplitTotal!: number | null;
  @ApiProperty({ type: [InstallmentItemTagDto] })
  tags!: InstallmentItemTagDto[];

  // Installment fields
  @ApiProperty() installmentId!: string;
  @ApiProperty() installmentNumber!: number;
  @ApiProperty() totalInstallments!: number;
  @ApiProperty() installmentAmount!: number;
  @ApiProperty() installmentDueDate!: string;
  @ApiProperty() installmentStatus!: string;
  @ApiProperty() installmentPaidAmount!: number;
  @ApiPropertyOptional({ nullable: true }) installmentNotes!: string | null;

  // Payable fields
  @ApiProperty() payableId!: string;
  @ApiProperty() vendorName!: string;
  @ApiPropertyOptional({ nullable: true }) categoryName!: string | null;
  @ApiProperty() payableCreatedAt!: string;
  @ApiPropertyOptional({ nullable: true }) payableNotes!: string | null;
}

export class InstallmentItemsReportSummaryDto {
  @ApiProperty() totalItems!: number;
  @ApiProperty() totalAmount!: number;
  @ApiProperty() uniqueInstallments!: number;
  @ApiProperty() uniquePayables!: number;
}

export class InstallmentItemsReportResponseDto {
  @ApiProperty({ type: [InstallmentItemReportRowDto] })
  data!: InstallmentItemReportRowDto[];

  @ApiProperty() total!: number;

  @ApiProperty({ type: InstallmentItemsReportSummaryDto })
  summary!: InstallmentItemsReportSummaryDto;
}

// ─── Grouped by description ────────────────────────────────────────────────

export class InstallmentItemGroupedRowDto {
  @ApiProperty() description!: string;
  @ApiProperty() totalAmount!: number;
  @ApiProperty() itemCount!: number;
  @ApiProperty() installmentCount!: number;
  @ApiProperty() payableCount!: number;
  @ApiProperty({ type: [InstallmentItemTagDto] })
  tags!: InstallmentItemTagDto[];
}

export class InstallmentItemsGroupedSummaryDto {
  @ApiProperty() totalAmount!: number;
  @ApiProperty() uniqueDescriptions!: number;
  @ApiProperty() uniqueInstallments!: number;
  @ApiProperty() uniquePayables!: number;
}

export class InstallmentItemsGroupedResponseDto {
  @ApiProperty({ type: [InstallmentItemGroupedRowDto] })
  data!: InstallmentItemGroupedRowDto[];

  @ApiProperty() total!: number;

  @ApiProperty({ type: InstallmentItemsGroupedSummaryDto })
  summary!: InstallmentItemsGroupedSummaryDto;
}

// ─── Grouped by tag ────────────────────────────────────────────────────────

export class InstallmentItemTagGroupSummaryDto {
  @ApiProperty() tagId!: string;
  @ApiProperty() tagName!: string;
  @ApiPropertyOptional({ nullable: true }) tagColor!: string | null;
  @ApiProperty() totalAmount!: number;
  @ApiProperty() itemCount!: number;
  @ApiProperty() installmentCount!: number;
  @ApiProperty() payableCount!: number;
}

export class InstallmentItemsGroupedByTagResponseDto {
  @ApiProperty({ type: [InstallmentItemTagGroupSummaryDto] })
  data!: InstallmentItemTagGroupSummaryDto[];
}
