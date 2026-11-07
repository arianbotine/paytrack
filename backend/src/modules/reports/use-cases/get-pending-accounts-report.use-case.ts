import { BadRequestException, Injectable } from '@nestjs/common';
import { PendingAccountsReportRepository } from '../repositories';
import {
  PendingAccountReportRowDto,
  PendingAccountsReportFilterDto,
  PendingAccountsReportResponseDto,
} from '../dto';

@Injectable()
export class GetPendingAccountsReportUseCase {
  constructor(private readonly repository: PendingAccountsReportRepository) {}

  async execute(
    organizationId: string,
    filters: PendingAccountsReportFilterDto
  ): Promise<PendingAccountsReportResponseDto> {
    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final'
      );
    }

    const { data, summary } = await this.repository.findByFilters(
      organizationId,
      filters
    );
    const today = new Date().toISOString().slice(0, 10);

    const rows: PendingAccountReportRowDto[] = data.map(row => ({
      type: row.type,
      accountId: row.account_id,
      installmentId: row.installment_id,
      counterpartyName: row.counterparty_name,
      categoryName: row.category_name,
      installmentNumber: row.installment_number,
      totalInstallments: row.total_installments,
      dueDate: row.due_date.toISOString().slice(0, 10),
      amount: Number(row.amount),
      settledAmount: Number(row.settled_amount),
      outstandingAmount: Number(row.outstanding_amount),
      status: row.status,
      isOverdue: row.due_date.toISOString().slice(0, 10) < today,
      accountNotes: row.account_notes,
      installmentNotes: row.installment_notes,
    }));

    return {
      data: rows,
      total: Number(summary.total),
      summary: {
        payableCount: Number(summary.payable_count),
        receivableCount: Number(summary.receivable_count),
        payableOutstandingAmount: Number(summary.payable_outstanding_amount),
        receivableOutstandingAmount: Number(
          summary.receivable_outstanding_amount
        ),
      },
    };
  }
}
