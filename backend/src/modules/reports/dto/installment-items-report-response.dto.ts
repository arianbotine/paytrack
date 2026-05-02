import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstallmentItemTagDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) color: string | null;
}

export class InstallmentItemReportRowDto {
  // Item fields
  @ApiProperty() itemId: string;
  @ApiProperty() itemDescription: string;
  @ApiProperty() itemAmount: number;
  @ApiProperty() itemSortOrder: number;
  @ApiProperty() itemCreatedAt: string;
  @ApiProperty({ type: [InstallmentItemTagDto] }) tags: InstallmentItemTagDto[];

  // Installment fields
  @ApiProperty() installmentId: string;
  @ApiProperty() installmentNumber: number;
  @ApiProperty() totalInstallments: number;
  @ApiProperty() installmentAmount: number;
  @ApiProperty() installmentDueDate: string;
  @ApiProperty() installmentStatus: string;
  @ApiProperty() installmentPaidAmount: number;
  @ApiPropertyOptional({ nullable: true }) installmentNotes: string | null;

  // Payable fields
  @ApiProperty() payableId: string;
  @ApiProperty() vendorName: string;
  @ApiPropertyOptional({ nullable: true }) categoryName: string | null;
  @ApiProperty() payableCreatedAt: string;
  @ApiPropertyOptional({ nullable: true }) payableNotes: string | null;
}

export class InstallmentItemsReportSummaryDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() totalAmount: number;
  @ApiProperty() uniqueInstallments: number;
  @ApiProperty() uniquePayables: number;
}

export class InstallmentItemsReportResponseDto {
  @ApiProperty({ type: [InstallmentItemReportRowDto] })
  data: InstallmentItemReportRowDto[];

  @ApiProperty() total: number;

  @ApiProperty({ type: InstallmentItemsReportSummaryDto })
  summary: InstallmentItemsReportSummaryDto;
}
