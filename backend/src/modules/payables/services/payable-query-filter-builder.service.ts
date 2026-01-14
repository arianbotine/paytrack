import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayableFilterDto } from '../dto/payable.dto';
import { PayableStatus } from '../domain/payable-status.enum';
import { parseDateOnly } from '../../../shared/utils/date.utils';

/**
 * Serviço responsável por construir filtros de query para contas a pagar
 */
@Injectable()
export class PayableQueryFilterBuilder {
  /**
   * Constrói o filtro de status
   */
  buildStatusFilter(filters?: PayableFilterDto): PayableStatus[] | undefined {
    return filters?.status;
  }

  /**
   * Constrói o objeto where completo para a query
   */
  buildWhereClause(
    organizationId: string,
    filters?: PayableFilterDto
  ): Prisma.PayableWhereInput {
    const statusFilter = this.buildStatusFilter(filters);

    // Construir filtro de installments
    const installmentFilters: any[] = [];

    // Filtro de datas de vencimento
    if (filters?.installmentDueDateFrom || filters?.installmentDueDateTo) {
      installmentFilters.push({
        dueDate: {
          ...(filters?.installmentDueDateFrom && {
            gte: parseDateOnly(filters.installmentDueDateFrom),
          }),
          ...(filters?.installmentDueDateTo && {
            lte: parseDateOnly(filters.installmentDueDateTo),
          }),
        },
        // Ao filtrar por data, considerar apenas parcelas não totalmente pagas
        status: { not: 'PAID' },
      });
    }

    // Filtro de tags de parcelas
    if (filters?.installmentTagIds && filters.installmentTagIds.length > 0) {
      installmentFilters.push({
        tags: {
          some: {
            tag: {
              id: { in: filters.installmentTagIds },
            },
          },
        },
      });
    }

    return {
      organizationId,
      ...(filters?.vendorId && { vendorId: filters.vendorId }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(statusFilter &&
        statusFilter.length > 0 && { status: { in: statusFilter } }),
      ...(filters?.tagIds && filters.tagIds.length > 0
        ? {
            tags: {
              some: {
                tagId: { in: filters.tagIds },
              },
            },
          }
        : {}),
      ...(installmentFilters.length > 0
        ? {
            installments: {
              some: {
                AND: installmentFilters,
              },
            },
          }
        : {}),
    };
  }

  /**
   * Constrói as opções de include para a query
   */
  buildIncludeOptions(): Prisma.PayableInclude {
    return {
      vendor: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      installments: {
        select: {
          id: true,
          installmentNumber: true,
          totalInstallments: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          status: true,
          notes: true,
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          payable: {
            select: {
              id: true,
              vendor: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { installmentNumber: 'asc' },
      },
    };
  }

  /**
   * Constrói as opções de include para query de um item específico
   */
  buildSingleIncludeOptions(): Prisma.PayableInclude {
    return {
      vendor: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      installments: {
        select: {
          id: true,
          installmentNumber: true,
          totalInstallments: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          status: true,
          notes: true,
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: { installmentNumber: 'asc' },
      },
    };
  }
}
