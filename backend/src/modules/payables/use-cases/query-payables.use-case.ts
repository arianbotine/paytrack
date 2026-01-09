import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayablesRepository } from '../repositories';
import { PayableFilterDto } from '../dto/payable.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { parseDateOnly, isOverdue } from '../../../shared/utils/date.utils';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PayableStatus } from '../domain/payable-status.enum';

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
    // Handle status filtering with hideCompleted
    let statusFilter = filters?.status;
    const hideCompleted = filters?.hideCompleted;
    if (hideCompleted) {
      if (statusFilter && statusFilter.length > 0) {
        // Remove PAID from the status filter
        statusFilter = statusFilter.filter(s => s !== PayableStatus.PAID);
      } else {
        // If no specific status filter, exclude PAID
        statusFilter = [
          PayableStatus.PENDING,
          PayableStatus.PARTIAL,
          PayableStatus.CANCELLED,
        ];
      }
    } else if (!statusFilter || statusFilter.length === 0) {
      statusFilter = undefined;
    }

    const where: Prisma.PayableWhereInput = {
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
              status: {
                in: [PayableStatus.PENDING, PayableStatus.PARTIAL],
              },
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

    // Type assertion para preservar installments
    type PayableWithInstallments = (typeof transformedData)[0] & {
      installments?: Array<{
        id: string;
        installmentNumber: number;
        totalInstallments: number;
        amount: any;
        paidAmount: any;
        dueDate: Date;
        status: any;
        payable?: {
          id: string;
          vendor: { id: string; name: string };
        };
      }>;
    };

    const mappedData = (transformedData as PayableWithInstallments[]).map(
      item => ({
        ...item,
        invoiceNumber: item.documentNumber,
        documentNumber: undefined,
        nextUnpaidDueDate: dueDateMap.get(item.id) || null,
        installments: item.installments?.map(inst => ({
          ...inst,
          isOverdue: isOverdue(inst.dueDate),
        })),
      })
    );

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

    type PayableWithInstallments = typeof payable & {
      installments: Array<{
        id: string;
        installmentNumber: number;
        totalInstallments: number;
        amount: any;
        paidAmount: any;
        dueDate: Date;
        status: any;
      }>;
    };

    const payableWithInstallments = payable as PayableWithInstallments;

    // Buscar próxima data não paga usando findFirst ao invés de $queryRaw
    // (para compatibilidade com schema isolado em testes E2E)
    const nextInstallment = await this.prisma.payableInstallment.findFirst({
      where: {
        payableId: payable.id,
        status: {
          in: [PayableStatus.PENDING, PayableStatus.PARTIAL],
        },
      },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true },
    });

    const nextUnpaidDueDate = nextInstallment?.dueDate
      ? nextInstallment.dueDate.toISOString().split('T')[0]
      : null;

    const transformed = MoneyUtils.transformMoneyFields(
      payableWithInstallments,
      ['amount', 'paidAmount']
    );

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
      nextUnpaidDueDate,
      installments: payableWithInstallments.installments.map(inst => ({
        ...inst,
        amount: Number(inst.amount),
        paidAmount: Number(inst.paidAmount),
        isOverdue: isOverdue(inst.dueDate),
      })),
    };
  }
}
