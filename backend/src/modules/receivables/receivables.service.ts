import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
} from './dto/receivable.dto';
import { CacheService } from '../../shared/services/cache.service';
import { AccountStatus, Prisma } from '@prisma/client';
import { parseDateOnly } from '../../shared/utils/date.utils';
import { MoneyUtils } from '../../shared/utils/money.utils';
import { generateInstallments } from '../../shared/utils/account.utils';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class ReceivablesService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly cacheService: CacheService
  ) {}

  protected invalidateDashboardCache(organizationId: string) {
    if (this.cacheService) {
      this.cacheService.del(`dashboard:summary:${organizationId}`);
    }
  }

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
    const where: any = {
      organizationId,
      ...(filters?.customerId && { customerId: filters.customerId }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.status &&
        filters.status.length > 0 && { status: { in: filters.status } }),
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
      this.prisma.receivable.findMany({
        where,
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
              description: true,
            },
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.receivable.count({ where }),
    ]);

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'receivedAmount',
    ]);

    const mappedData = transformedData.map((item: any) => ({
      ...item,
      invoiceNumber: item.documentNumber,
      documentNumber: undefined,
    }));

    return { data: mappedData, total };
  }

  async findOne(id: string, organizationId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
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
            description: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const transformed = MoneyUtils.transformMoneyFields(receivable, [
      'amount',
      'receivedAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async create(organizationId: string, createDto: CreateReceivableDto) {
    const { installmentCount = 1, dueDates, tagIds, ...baseData } = createDto;

    // Validação: dueDates obrigatório quando installmentCount > 1
    if (installmentCount > 1 && (!dueDates || dueDates.length === 0)) {
      throw new BadRequestException(
        'dueDates é obrigatório quando installmentCount > 1'
      );
    }

    // Validação: dueDates deve ter o mesmo tamanho que installmentCount
    if (dueDates && dueDates.length !== installmentCount) {
      throw new BadRequestException(
        `dueDates deve conter exatamente ${installmentCount} datas`
      );
    }

    // Criar conta + parcelas em transação
    const result = await this.prisma.$transaction(async tx => {
      // 1. Criar conta principal
      const receivable = await tx.receivable.create({
        data: {
          organizationId,
          customerId: baseData.customerId,
          categoryId: baseData.categoryId,
          description: baseData.description,
          amount: MoneyUtils.toDecimal(baseData.amount),
          dueDate: parseDateOnly(dueDates ? dueDates[0] : baseData.dueDate),
          notes: baseData.notes,
          documentNumber: baseData.invoiceNumber,
          totalInstallments: installmentCount,
          status: AccountStatus.PENDING,
          ...(tagIds && tagIds.length > 0
            ? {
                tags: {
                  create: tagIds.map((tagId: string) => ({ tagId })),
                },
              }
            : {}),
        },
      });

      // 2. Criar parcelas
      const installments = generateInstallments(
        baseData.amount,
        installmentCount,
        dueDates || [baseData.dueDate],
        receivable.id,
        organizationId,
        baseData.description,
        'receivable'
      ) as Prisma.ReceivableInstallmentCreateManyInput[];

      await tx.receivableInstallment.createMany({
        data: installments,
      });

      // 3. Retornar conta com parcelas
      return tx.receivable.findUnique({
        where: { id: receivable.id },
        include: {
          customer: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
      });
    });

    this.invalidateDashboardCache(organizationId);

    const transformed = MoneyUtils.transformMoneyFields(result!, [
      'amount',
      'receivedAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateReceivableDto
  ) {
    const { tagIds, ...data } = updateDto;

    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const updated = await this.prisma.receivable.update({
      where: { id },
      data: {
        ...data,
        ...(data.amount && { amount: MoneyUtils.toDecimal(data.amount) }),
        ...(data.dueDate && { dueDate: parseDateOnly(data.dueDate) }),
        ...(data.invoiceNumber && { documentNumber: data.invoiceNumber }),
        ...(tagIds && {
          tags: {
            deleteMany: {},
            create: tagIds.map(tagId => ({ tagId })),
          },
        }),
      },
      include: {
        customer: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    this.invalidateDashboardCache(organizationId);

    const transformed = MoneyUtils.transformMoneyFields(updated, [
      'amount',
      'receivedAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async remove(id: string, organizationId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
      include: {
        installments: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const hasPayments = receivable.installments.some(
      i => i.allocations.length > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível excluir conta com pagamentos registrados'
      );
    }

    await this.prisma.receivable.delete({
      where: { id },
    });

    this.invalidateDashboardCache(organizationId);
  }

  async cancel(id: string, organizationId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
      include: { installments: true },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    if (receivable.status === AccountStatus.CANCELLED) {
      throw new BadRequestException('Conta já está cancelada');
    }

    const hasPayments = receivable.installments.some(
      i => Number(i.receivedAmount) > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível cancelar conta com parcelas recebidas'
      );
    }

    await this.prisma.$transaction([
      this.prisma.receivable.update({
        where: { id },
        data: { status: AccountStatus.CANCELLED },
      }),
      this.prisma.receivableInstallment.updateMany({
        where: { receivableId: id },
        data: { status: AccountStatus.CANCELLED },
      }),
    ]);

    this.invalidateDashboardCache(organizationId);

    return this.findOne(id, organizationId);
  }

  async updateOverdueStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.receivableInstallment.updateMany({
      where: {
        status: AccountStatus.PENDING,
        dueDate: { lt: today },
      },
      data: { status: AccountStatus.OVERDUE },
    });

    return result;
  }

  async getPayments(receivableId: string, organizationId: string) {
    // Buscar payments que têm allocations para installments desta receivable
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        allocations: {
          some: {
            receivableInstallment: {
              receivableId,
            },
          },
        },
      },
      include: {
        allocations: {
          where: {
            receivableInstallment: {
              receivableId,
            },
          },
          include: {
            receivableInstallment: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // Transformar para o formato esperado
    return payments.map(payment => {
      // Pegar a primeira allocation (já filtrada)
      const allocation = payment.allocations[0];

      return {
        id: payment.id,
        amount: payment.amount,
        payment: {
          paymentDate: payment.paymentDate,
          method: payment.paymentMethod,
          notes: payment.notes,
        },
        installment: allocation?.receivableInstallment
          ? {
              installmentNumber:
                allocation.receivableInstallment.installmentNumber,
              totalInstallments:
                allocation.receivableInstallment.totalInstallments,
              description: allocation.receivableInstallment.description,
            }
          : undefined,
      };
    });
  }
}
