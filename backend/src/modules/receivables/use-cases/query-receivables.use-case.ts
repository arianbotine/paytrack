import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceivablesRepository } from '../repositories';
import { ReceivableFilterDto } from '../dto/receivable.dto';
import { parseDateOnly, isOverdue } from '../../../shared/utils/date.utils';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReceivableStatus } from '../domain/receivable-status.enum';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Use Case: Consultar Receivables
 * Responsabilidade: Queries (list, get)
 */
@Injectable()
export class QueryReceivablesUseCase {
  constructor(
    private readonly repository: ReceivablesRepository,
    private readonly prisma: PrismaService
  ) {}

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
    // Handle status filtering with hideCompleted
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

    const where: Prisma.ReceivableWhereInput = {
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

    const take = filters?.take
      ? Math.min(filters.take, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = filters?.skip || 0;

    const [data, total] = await Promise.all([
      this.repository.findMany(where, {
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        include: {
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
        },
      }),
      this.repository.count(where),
    ]);

    // Buscar próxima data não paga para cada receivable usando Prisma
    // (evita $queryRaw para compatibilidade com schema isolado em testes)
    const receivableIds = data.map(r => r.id);
    const nextInstallments =
      receivableIds.length > 0
        ? await this.prisma.receivableInstallment.findMany({
            where: {
              receivableId: { in: receivableIds },
              status: {
                in: [ReceivableStatus.PENDING, ReceivableStatus.PARTIAL],
              },
            },
            select: {
              receivableId: true,
              dueDate: true,
            },
            orderBy: { dueDate: 'asc' },
          })
        : [];

    // Criar map de IDs para próxima data (primeira por receivableId)
    const dueDateMap = new Map<string, string>();
    for (const inst of nextInstallments) {
      if (!dueDateMap.has(inst.receivableId)) {
        dueDateMap.set(
          inst.receivableId,
          inst.dueDate.toISOString().split('T')[0]
        );
      }
    }

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'receivedAmount',
    ]);

    // Type assertion para preservar installments
    type ReceivableWithInstallments = (typeof transformedData)[0] & {
      installments?: Array<{
        id: string;
        installmentNumber: number;
        totalInstallments: number;
        amount: any;
        receivedAmount: any;
        dueDate: Date;
        status: any;
        receivable?: {
          id: string;
          customer: { id: string; name: string };
        };
      }>;
    };

    return {
      data: (transformedData as ReceivableWithInstallments[]).map(item => ({
        ...item,
        nextUnpaidDueDate: dueDateMap.get(item.id) || null,
        installments: item.installments?.map(inst => ({
          ...inst,
          isOverdue: isOverdue(inst.dueDate),
        })),
      })),
      total,
    };
  }

  async findOne(id: string, organizationId: string) {
    const receivable = await this.repository.findFirst(
      { id, organizationId },
      {
        customer: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
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
      }
    );

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    type ReceivableWithInstallments = typeof receivable & {
      installments: Array<{
        id: string;
        installmentNumber: number;
        totalInstallments: number;
        amount: any;
        receivedAmount: any;
        dueDate: Date;
        status: any;
      }>;
    };

    const receivableWithInstallments = receivable as ReceivableWithInstallments;

    // Buscar próxima data não paga usando findFirst ao invés de $queryRaw
    // (para compatibilidade com schema isolado em testes E2E)
    const nextInstallment = await this.prisma.receivableInstallment.findFirst({
      where: {
        receivableId: receivableWithInstallments.id,
        status: {
          in: [ReceivableStatus.PENDING, ReceivableStatus.PARTIAL],
        },
      },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true },
    });

    const nextUnpaidDueDate = nextInstallment?.dueDate
      ? nextInstallment.dueDate.toISOString().split('T')[0]
      : null;

    const transformed = MoneyUtils.transformMoneyFields(
      receivableWithInstallments,
      ['amount', 'receivedAmount']
    );

    return {
      ...transformed,
      nextUnpaidDueDate,
      installments: receivableWithInstallments.installments.map(inst => ({
        ...inst,
        amount: Number(inst.amount),
        receivedAmount: Number(inst.receivedAmount),
        isOverdue: isOverdue(inst.dueDate),
      })),
    };
  }
}
