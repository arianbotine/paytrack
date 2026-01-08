import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayablesRepository } from '../repositories';
import { PayableFilterDto } from '../dto/payable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { parseDateOnly } from '../../../shared/utils/date.utils';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Use Case: Listar contas a pagar com filtros
 * Responsabilidade: construir query e formatar resultados
 */
@Injectable()
export class ListPayablesUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly prisma: PrismaService
  ) {}

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
              payable: {
                select: {
                  id: true,
                  vendor: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.payablesRepository.count(where),
    ]);

    // Buscar próxima data não paga para cada payable usando Prisma
    // (evita $queryRaw para compatibilidade com schema isolado em testes)
    const payableIds = data.map(p => p.id);
    const nextInstallments =
      payableIds.length > 0
        ? await this.prisma.payableInstallment.findMany({
            where: {
              payableId: { in: payableIds },
              status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            },
            select: {
              payableId: true,
              dueDate: true,
            },
            orderBy: { dueDate: 'asc' },
          })
        : [];

    // Criar map de IDs para próxima data (primeira por payableId)
    const dueDateMap = new Map<string, string>();
    for (const inst of nextInstallments) {
      if (!dueDateMap.has(inst.payableId)) {
        dueDateMap.set(
          inst.payableId,
          inst.dueDate.toISOString().split('T')[0]
        );
      }
    }

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'paidAmount',
    ]);

    const mappedData = transformedData.map(item => ({
      ...item,
      invoiceNumber: item.documentNumber,
      documentNumber: undefined,
      nextUnpaidDueDate: dueDateMap.get(item.id) || null,
    }));

    return { data: mappedData, total };
  }
}

/**
 * Use Case: Buscar uma conta a pagar por ID
 */
@Injectable()
export class GetPayableUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly prisma: PrismaService
  ) {}

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

    // Buscar próxima data não paga usando findFirst ao invés de $queryRaw
    // (para compatibilidade com schema isolado em testes E2E)
    const nextInstallment = await this.prisma.payableInstallment.findFirst({
      where: {
        payableId: payable.id,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true },
    });

    const nextUnpaidDueDate = nextInstallment?.dueDate
      ? nextInstallment.dueDate.toISOString().split('T')[0]
      : null;

    const transformed = MoneyUtils.transformMoneyFields(payable, [
      'amount',
      'paidAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
      nextUnpaidDueDate,
    };
  }
}
