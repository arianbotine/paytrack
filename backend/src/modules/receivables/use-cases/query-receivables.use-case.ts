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

    // Buscar próxima data não paga para cada receivable usando Prisma
    // (evita $queryRaw para compatibilidade com schema isolado em testes)
    const receivableIds = data.map(r => r.id);
    const nextInstallments =
      receivableIds.length > 0
        ? await this.prisma.receivableInstallment.findMany({
            where: {
              receivableId: { in: receivableIds },
              status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
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

    // Buscar próxima data não paga usando findFirst ao invés de $queryRaw
    // (para compatibilidade com schema isolado em testes E2E)
    const nextInstallment = await this.prisma.receivableInstallment.findFirst({
      where: {
        receivableId: receivable.id,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true },
    });

    const nextUnpaidDueDate = nextInstallment?.dueDate
      ? nextInstallment.dueDate.toISOString().split('T')[0]
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
