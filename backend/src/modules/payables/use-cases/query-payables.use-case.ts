import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayablesRepository } from '../repositories';
import { PayableFilterDto } from '../dto/payable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { parseDateOnly } from '../../../shared/utils/date.utils';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Use Case: Listar contas a pagar com filtros
 * Responsabilidade: construir query e formatar resultados
 */
@Injectable()
export class ListPayablesUseCase {
  constructor(private readonly payablesRepository: PayablesRepository) {}

  async execute(organizationId: string, filters?: PayableFilterDto) {
    const where: Prisma.PayableWhereInput = {
      organizationId,
      ...(filters?.vendorId && { vendorId: filters.vendorId }),
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
      this.payablesRepository.findMany(where, {
        include: {
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
            },
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.payablesRepository.count(where),
    ]);

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'paidAmount',
    ]);

    const mappedData = transformedData.map(item => ({
      ...item,
      invoiceNumber: item.documentNumber,
      documentNumber: undefined,
    }));

    return { data: mappedData, total };
  }
}

/**
 * Use Case: Buscar uma conta a pagar por ID
 */
@Injectable()
export class GetPayableUseCase {
  constructor(private readonly payablesRepository: PayablesRepository) {}

  async execute(id: string, organizationId: string) {
    const payable = await this.payablesRepository.findFirst(
      { id, organizationId },
      {
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
          },
          orderBy: { installmentNumber: 'asc' },
        },
      }
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    const transformed = MoneyUtils.transformMoneyFields(payable, [
      'amount',
      'paidAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }
}
