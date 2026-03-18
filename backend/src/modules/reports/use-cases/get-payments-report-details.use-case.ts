import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentsReportsRepository } from '../repositories';
import {
  PaymentsReportFilterDto,
  PaymentsReportDetailItemDto,
  PaymentsReportDetailsResponseDto,
  ReportTagDto,
} from '../dto';

@Injectable()
export class GetPaymentsReportDetailsUseCase {
  constructor(private readonly repository: PaymentsReportsRepository) {}

  async execute(
    organizationId: string,
    filters: PaymentsReportFilterDto
  ): Promise<PaymentsReportDetailsResponseDto> {
    if (!filters.startDate || !filters.endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    const startDate = new Date(filters.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);

    const { data, total } = await this.repository.getPaymentsDetails(
      organizationId,
      startDate,
      endDate,
      filters.skip ?? 0,
      filters.take ?? 10,
      filters
    );

    const items: PaymentsReportDetailItemDto[] = data.map(row => {
      const payableAmt = Number(row.payable_amount);
      const receivableAmt = Number(row.receivable_amount);

      let type: 'payable' | 'receivable' | 'mixed';
      if (payableAmt > 0 && receivableAmt > 0) {
        type = 'mixed';
      } else if (receivableAmt > 0) {
        type = 'receivable';
      } else {
        type = 'payable';
      }

      const tags: ReportTagDto[] = row.tags_json
        ? row.tags_json.map(t => ({
            id: t.id,
            name: t.name,
            color: t.color ?? null,
          }))
        : [];

      return {
        id: row.id,
        paymentDate: row.payment_date.toISOString(),
        amount: Number(row.amount),
        paymentMethod: row.payment_method,
        type,
        vendorName: row.vendor_name ?? null,
        customerName: row.customer_name ?? null,
        categoryName: row.category_name ?? null,
        reference: row.reference ?? null,
        notes: row.notes ?? null,
        tags,
      };
    });

    return { data: items, total };
  }
}
