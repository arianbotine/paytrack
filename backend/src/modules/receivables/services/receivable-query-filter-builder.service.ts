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
   * Constrói o filtro de status considerando a opção hideCompleted
   */
  buildStatusFilter(
    filters?: ReceivableFilterDto
  ): ReceivableStatus[] | undefined {
    let statusFilter = filters?.status;
    const hideCompleted = filters?.hideCompleted;

    if (hideCompleted) {
      if (statusFilter && statusFilter.length > 0) {
        // Remove PAID from the status filter
        statusFilter = statusFilter.filter(s => s !== ReceivableStatus.PAID);
      } else {
        // If no specific status filter, exclude PAID
        statusFilter = [
          ReceivableStatus.PENDING,
          ReceivableStatus.PARTIAL,
          ReceivableStatus.CANCELLED,
        ];
      }
    } else if (!statusFilter || statusFilter.length === 0) {
      statusFilter = undefined;
    }

    return statusFilter;
  }

  /**
   * Constrói o objeto where completo para a query
   */
  buildWhereClause(
    organizationId: string,
    filters?: ReceivableFilterDto
  ): Prisma.ReceivableWhereInput {
    const statusFilter = this.buildStatusFilter(filters);

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
      ...(filters?.installmentDueDateFrom || filters?.installmentDueDateTo
        ? {
            installments: {
              some: {
                dueDate: {
                  ...(filters?.installmentDueDateFrom && {
                    gte: parseDateOnly(filters.installmentDueDateFrom),
                  }),
                  ...(filters?.installmentDueDateTo && {
                    lte: parseDateOnly(filters.installmentDueDateTo),
                  }),
                },
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
          receivable: {
            select: {
              id: true,
              customer: { select: { id: true, name: true } },
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
        },
        orderBy: { installmentNumber: 'asc' },
      },
    };
  }
}
