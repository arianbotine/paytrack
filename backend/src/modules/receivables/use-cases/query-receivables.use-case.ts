import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceivablesRepository } from '../repositories';
import { ReceivableFilterDto } from '../dto/receivable.dto';
import { parseDateOnly } from '../../../shared/utils/date.utils';
import { MoneyUtils } from '../../../shared/utils/money.utils';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Use Case: Consultar Receivables
 * Responsabilidade: Queries (list, get)
 */
@Injectable()
export class QueryReceivablesUseCase {
  constructor(private readonly repository: ReceivablesRepository) {}

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
      ...(filters?.dueDateFrom || filters?.dueDateTo
        ? {
            dueDate: {
              ...(filters?.dueDateFrom && {
                gte: parseDateOnly(filters.dueDateFrom),
              }),
              ...(filters?.dueDateTo && {
                lte: parseDateOnly(filters.dueDateTo),
              }),
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
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
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

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'receivedAmount',
    ]);

    return { data: transformedData, total };
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

    return MoneyUtils.transformMoneyFields(receivable, [
      'amount',
      'receivedAmount',
    ]);
  }
}
