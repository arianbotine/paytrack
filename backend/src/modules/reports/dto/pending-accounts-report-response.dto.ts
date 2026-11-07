import { ApiProperty } from '@nestjs/swagger';
import { PendingAccountType } from './pending-accounts-report-filter.dto';

export class PendingAccountReportRowDto {
  @ApiProperty({
    enum: [PendingAccountType.PAYABLE, PendingAccountType.RECEIVABLE],
  })
  type!: PendingAccountType.PAYABLE | PendingAccountType.RECEIVABLE;

  @ApiProperty() accountId!: string;
  @ApiProperty() installmentId!: string;
  @ApiProperty() counterpartyName!: string;
  @ApiProperty({ nullable: true }) categoryName!: string | null;
  @ApiProperty() installmentNumber!: number;
  @ApiProperty() totalInstallments!: number;
  @ApiProperty({ example: '2026-11-07' }) dueDate!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() settledAmount!: number;
  @ApiProperty() outstandingAmount!: number;
  @ApiProperty({ enum: ['PENDING', 'PARTIAL'] }) status!: 'PENDING' | 'PARTIAL';
  @ApiProperty() isOverdue!: boolean;
  @ApiProperty({ nullable: true }) accountNotes!: string | null;
  @ApiProperty({ nullable: true }) installmentNotes!: string | null;
}

export class PendingAccountsReportSummaryDto {
  @ApiProperty() payableCount!: number;
  @ApiProperty() receivableCount!: number;
  @ApiProperty() payableOutstandingAmount!: number;
  @ApiProperty() receivableOutstandingAmount!: number;
}

export class PendingAccountsReportResponseDto {
  @ApiProperty({ type: [PendingAccountReportRowDto] })
  data!: PendingAccountReportRowDto[];

  @ApiProperty() total!: number;

  @ApiProperty({ type: PendingAccountsReportSummaryDto })
  summary!: PendingAccountsReportSummaryDto;
}
