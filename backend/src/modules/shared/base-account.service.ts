import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MoneyUtils } from '../../shared/utils/money.utils';
import { parseDateUTC } from '../../shared/utils/date.utils';
import { mapInvoiceToDocument } from '../../shared/utils/account.utils';
import { CacheService } from '../../shared/services/cache.service';

// Constantes de paginação
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

export abstract class BaseAccountService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly cacheService?: CacheService
  ) {}

  protected invalidateDashboardCache(organizationId: string) {
    if (this.cacheService) {
      this.cacheService.del(`dashboard:summary:${organizationId}`);
    }
  }

  protected abstract getModel(): any; // e.g., this.prisma.payable or receivable
  protected abstract getEntityName(): string; // 'payable' or 'receivable'
  protected abstract getIncludeOptions(): any;
  protected getMoneyFields(): string[] {
    return ['amount', 'paidAmount'];
  }

  protected async findAllBase(
    organizationId: string,
    filters: any,
    whereExtra: any = {}
  ) {
    const where: any = {
      organizationId,
      ...whereExtra,
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.status &&
        filters.status.length > 0 && { status: { in: filters.status } }),
      ...(filters?.dueDateFrom || filters?.dueDateTo
        ? {
            dueDate: {
              ...(filters?.dueDateFrom && {
                gte: parseDateUTC(filters.dueDateFrom),
              }),
              ...(filters?.dueDateTo && {
                lte: parseDateUTC(filters.dueDateTo),
              }),
            },
          }
        : {}),
    };

    // Aplicar limites de paginação
    const take = filters?.take
      ? Math.min(filters.take, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = filters?.skip || 0;

    const [data, total] = await Promise.all([
      this.getModel().findMany({
        where,
        include: this.getIncludeOptions(),
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.getModel().count({ where }),
    ]);

    const transformedData = MoneyUtils.transformMoneyFieldsArray(
      data,
      this.getMoneyFields()
    );

    const mappedData = transformedData.map((item: any) => ({
      ...item,
      invoiceNumber: item.documentNumber,
      documentNumber: undefined,
    }));

    return { data: mappedData, total };
  }

  protected async findOneBase(id: string, organizationId: string) {
    const item = await this.getModel().findFirst({
      where: { id, organizationId },
      include: {
        ...this.getIncludeOptions(),
        allocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`${this.getEntityName()} não encontrada`);
    }

    const transformed = MoneyUtils.transformMoneyFields(
      item,
      this.getMoneyFields()
    );

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  protected async createBase(organizationId: string, createDto: any) {
    const { tagIds, ...data } = createDto;

    const item = await this.getModel().create({
      data: {
        organizationId,
        vendorId: data.vendorId,
        customerId: data.customerId,
        categoryId: data.categoryId,
        description: data.description,
        amount: MoneyUtils.toDecimal(data.amount),
        dueDate: parseDateUTC(data.dueDate),
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        documentNumber: data.invoiceNumber,
        ...(tagIds && tagIds.length > 0
          ? {
              tags: {
                create: tagIds.map((tagId: string) => ({ tagId })),
              },
            }
          : {}),
      },
      include: this.getIncludeOptions(),
    });

    // Invalida cache do dashboard
    this.invalidateDashboardCache(organizationId);

    return MoneyUtils.transformMoneyFields(item, this.getMoneyFields());
  }

  protected async updateBase(
    id: string,
    organizationId: string,
    updateDto: any,
    tagModel: any
  ) {
    const item = await this.findOneBase(id, organizationId);

    if (item.status === AccountStatus.PAID) {
      throw new BadRequestException(
        `Não é possível editar uma ${this.getEntityName()} já paga`
      );
    }

    const { tagIds, ...data } = updateDto;

    if (tagIds !== undefined) {
      await tagModel.deleteMany({
        where: { [`${this.getEntityName()}Id`]: id },
      });

      if (tagIds.length > 0) {
        await tagModel.createMany({
          data: tagIds.map((tagId: string) => ({
            [`${this.getEntityName()}Id`]: id,
            tagId,
          })),
        });
      }
    }

    const updateData = mapInvoiceToDocument(data);

    const updated = await this.getModel().update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.amount && {
          amount: MoneyUtils.toDecimal(updateData.amount),
        }),
        ...(updateData.dueDate && {
          dueDate: parseDateUTC(updateData.dueDate),
        }),
      },
      include: this.getIncludeOptions(),
    });

    // Invalida cache do dashboard
    this.invalidateDashboardCache(organizationId);

    return MoneyUtils.transformMoneyFields(updated, this.getMoneyFields());
  }

  protected async removeBase(id: string, organizationId: string) {
    const item = await this.findOneBase(id, organizationId);

    if (
      item.status === AccountStatus.PAID ||
      item.status === AccountStatus.PARTIAL
    ) {
      throw new BadRequestException(
        `Não é possível excluir uma ${this.getEntityName()} com pagamentos realizados`
      );
    }

    await this.getModel().delete({ where: { id } });

    // Invalida cache do dashboard
    this.invalidateDashboardCache(organizationId);

    return item;
  }

  protected async cancelBase(id: string, organizationId: string) {
    const item = await this.findOneBase(id, organizationId);

    if (item.status === AccountStatus.PAID) {
      throw new BadRequestException(
        `Não é possível cancelar uma ${this.getEntityName()} já paga`
      );
    }

    const updated = await this.getModel().update({
      where: { id },
      data: { status: AccountStatus.CANCELLED },
    });

    // Invalida cache do dashboard
    this.invalidateDashboardCache(organizationId);

    return updated;
  }

  protected async updateOverdueStatusBase(organizationId?: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const where: any = {
      dueDate: { lt: today },
      status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
      ...(organizationId && { organizationId }),
    };

    return this.getModel().updateMany({
      where,
      data: { status: AccountStatus.OVERDUE },
    });
  }
}
