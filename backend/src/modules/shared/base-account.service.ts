import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AccountStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { MoneyUtils } from "../../shared/utils/money.utils";
import { parseDateUTC } from "../../shared/utils/date.utils";
import { mapInvoiceToDocument } from "../../shared/utils/account.utils";

export abstract class BaseAccountService {
  constructor(protected readonly prisma: PrismaService) {}

  protected abstract getModel(): any; // e.g., this.prisma.payable or receivable
  protected abstract getEntityName(): string; // 'payable' or 'receivable'
  protected abstract getIncludeOptions(): any;

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
              ...(filters?.dueDateTo && { lte: parseDateUTC(filters.dueDateTo) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.getModel().findMany({
        where,
        include: this.getIncludeOptions(),
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip: filters?.skip,
        take: filters?.take,
      }),
      this.getModel().count({ where }),
    ]);

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      "amount",
      "paidAmount",
    ]);

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

    const transformed = MoneyUtils.transformMoneyFields(item, [
      "amount",
      "paidAmount",
    ]);

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

    return MoneyUtils.transformMoneyFields(item, ["amount", "paidAmount"]);
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
        `Não é possível editar uma ${this.getEntityName()} já paga`,
      );
    }

    const { tagIds, ...data } = updateDto;

    if (tagIds !== undefined) {
      await tagModel.deleteMany({
        where: { [`${this.getEntityName()}Id`]: id },
      });

      if (tagIds.length > 0) {
        await tagModel.createMany({
          data: tagIds.map((tagId: string) => ({ [`${this.getEntityName()}Id`]: id, tagId })),
        });
      }
    }

    const updateData = mapInvoiceToDocument(data);

    const updated = await this.getModel().update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.amount && { amount: MoneyUtils.toDecimal(updateData.amount) }),
        ...(updateData.dueDate && { dueDate: parseDateUTC(updateData.dueDate) }),
      },
      include: this.getIncludeOptions(),
    });

    return MoneyUtils.transformMoneyFields(updated, ["amount", "paidAmount"]);
  }

  protected async removeBase(id: string, organizationId: string) {
    const item = await this.findOneBase(id, organizationId);

    if (
      item.status === AccountStatus.PAID ||
      item.status === AccountStatus.PARTIAL
    ) {
      throw new BadRequestException(
        `Não é possível excluir uma ${this.getEntityName()} com pagamentos realizados`,
      );
    }

    await this.getModel().delete({ where: { id } });
    return item;
  }

  protected async cancelBase(id: string, organizationId: string) {
    const item = await this.findOneBase(id, organizationId);

    if (item.status === AccountStatus.PAID) {
      throw new BadRequestException(
        `Não é possível cancelar uma ${this.getEntityName()} já paga`,
      );
    }

    return this.getModel().update({
      where: { id },
      data: { status: AccountStatus.CANCELLED },
    });
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