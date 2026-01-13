import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceivableFilterDto } from '../dto/receivable.dto';
import { ReceivableStatus } from '../domain/receivable-status.enum';
import { parseDateOnly } from '../../../shared/utils/date.utils';

/**
 * Serviço responsável por construir filtros de query para contas a receber
 */
@Injectable()
export class ReceivableQueryFilterBuilder {
  /**
   * Constrói o filtro de status
   */
  buildStatusFilter(
    filters?: ReceivableFilterDto
  ): ReceivableStatus[] | undefined {
    return filters?.status;
  }

  /**
   * Constrói o objeto where completo para a query
   */
  buildWhereClause(
    organizationId: string,
    filters?: ReceivableFilterDto
  ): Prisma.ReceivableWhereInput {
    const statusFilter = this.buildStatusFilter(filters);

    // Construir filtro de parcelas combinando data e tags
    const installmentFilters: Prisma.ReceivableInstallmentWhereInput[] = [];

    // Filtro de data de vencimento das parcelas
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
      });
    }

    // Filtro de tags das parcelas
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
      ...(filters?.customerId && { customerId: filters.customerId }),
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
  buildIncludeOptions(): Prisma.ReceivableInclude {
    return {
      customer: { select: { id: true, name: true } },
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
          receivedAmount: true,
          dueDate: true,
          status: true,
          notes: true,
          receivable: {
            select: {
              id: true,
              customer: { select: { id: true, name: true } },
            },
          },
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

  /**
   * Constrói as opções de include para query de um item específico
   */
  buildSingleIncludeOptions(): Prisma.ReceivableInclude {
    return {
      customer: { select: { id: true, name: true } },
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
          receivedAmount: true,
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
