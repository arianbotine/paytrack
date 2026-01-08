import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceivablesRepository } from '../repositories';
import { ReceivableFilterDto } from '../dto/receivable.dto';
import { parseDateOnly } from '../../../shared/utils/date.utils';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

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
    const where: Prisma.ReceivableWhereInput = {
      organizationId,
      ...(filters?.customerId && { customerId: filters.customerId }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.status &&
        filters.status.length > 0 && { status: { in: filters.status } }),
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

    // Buscar próxima data não paga para cada receivable usando raw query otimizada
    const receivableIds = data.map(r => r.id);
    const nextDueDatesRaw =
      receivableIds.length > 0
        ? await this.prisma.$queryRaw<
            Array<{ receivable_id: string; next_due_date: Date }>
          >`
          SELECT receivable_id, MIN(due_date)::date as next_due_date
          FROM receivable_installments
          WHERE receivable_id IN (${Prisma.join(receivableIds)})
            AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
          GROUP BY receivable_id
        `
        : [];

    // Criar map de IDs para datas
    const dueDateMap = new Map<string, string>();
    for (const row of nextDueDatesRaw) {
      dueDateMap.set(
        row.receivable_id,
        row.next_due_date.toISOString().split('T')[0]
      );
    }

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'receivedAmount',
    ]);

    return {
      data: transformedData.map(item => ({
        ...item,
        nextUnpaidDueDate: dueDateMap.get(item.id) || null,
      })),
      total,
    };
  }

  async findOne(id: string, organizationId: string) {
    const receivable = await this.repository.findFirst(
      { id, organizationId },
      {
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
      }
    );

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Buscar próxima data não paga
    const nextDueDateRaw = await this.prisma.$queryRaw<
      Array<{ next_due_date: Date }>
    >`
      SELECT MIN(due_date)::date as next_due_date
      FROM receivable_installments
      WHERE receivable_id = ${receivable.id}
        AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    `;

    const nextUnpaidDueDate = nextDueDateRaw[0]?.next_due_date
      ? nextDueDateRaw[0].next_due_date.toISOString().split('T')[0]
      : null;

    return {
      ...MoneyUtils.transformMoneyFields(receivable, [
        'amount',
        'receivedAmount',
      ]),
      nextUnpaidDueDate,
    };
  }
}
