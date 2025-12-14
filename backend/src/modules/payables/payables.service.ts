import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AccountStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import {
  CreatePayableDto,
  UpdatePayableDto,
  PayableFilterDto,
} from "./dto/payable.dto";
import { MoneyUtils } from "../../shared/utils/money.utils";
import { parseDateUTC } from "../../shared/utils/date.utils";

@Injectable()
export class PayablesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, filters?: PayableFilterDto) {
    const where: Prisma.PayableWhereInput = {
      organizationId,
      ...(filters?.vendorId && { vendorId: filters.vendorId }),
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
      this.prisma.payable.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true, color: true },
          },
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip: filters?.skip,
        take: filters?.take,
      }),
      this.prisma.payable.count({ where }),
    ]);

    // Transform Decimal fields to numbers for JSON serialization
    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      "amount",
      "paidAmount",
    ]);

    // Map documentNumber to invoiceNumber for frontend compatibility
    const mappedData = transformedData.map((item) => ({
      ...item,
      invoiceNumber: item.documentNumber,
      documentNumber: undefined,
    }));

    return { data: mappedData, total };
  }

  async findOne(id: string, organizationId: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, organizationId },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        allocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!payable) {
      throw new NotFoundException("Conta a pagar não encontrada");
    }

    // Transform Decimal fields to numbers for JSON serialization
    const transformed = MoneyUtils.transformMoneyFields(payable, ["amount", "paidAmount"]);

    // Map documentNumber to invoiceNumber for frontend compatibility
    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async create(organizationId: string, createDto: CreatePayableDto) {
    const { tagIds, ...data } = createDto;

    const payable = await this.prisma.payable.create({
      data: {
        organizationId,
        vendorId: data.vendorId,
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
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    // Transform Decimal fields to numbers for JSON serialization
    return MoneyUtils.transformMoneyFields(payable, ["amount", "paidAmount"]);
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdatePayableDto,
  ) {
    const payable = await this.findOne(id, organizationId);

    if (payable.status === AccountStatus.PAID) {
      throw new BadRequestException("Não é possível editar uma conta já paga");
    }

    const { tagIds, ...data } = updateDto;

    // Handle tags update
    if (tagIds !== undefined) {
      await this.prisma.payableTag.deleteMany({ where: { payableId: id } });

      if (tagIds.length > 0) {
        await this.prisma.payableTag.createMany({
          data: tagIds.map((tagId) => ({ payableId: id, tagId })),
        });
      }
    }

    // Map invoiceNumber to documentNumber
    const updateData = { ...data } as any;
    if (updateData.invoiceNumber !== undefined) {
      updateData.documentNumber = updateData.invoiceNumber;
      delete updateData.invoiceNumber;
    }

    // Transform Decimal fields to numbers for JSON serialization
    const updated = await this.prisma.payable.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.amount && { amount: MoneyUtils.toDecimal(updateData.amount) }),
        ...(updateData.dueDate && { dueDate: parseDateUTC(updateData.dueDate) }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    return MoneyUtils.transformMoneyFields(updated, ["amount", "paidAmount"]);
  }

  async remove(id: string, organizationId: string) {
    const payable = await this.findOne(id, organizationId);

    if (
      payable.status === AccountStatus.PAID ||
      payable.status === AccountStatus.PARTIAL
    ) {
      throw new BadRequestException(
        "Não é possível excluir uma conta com pagamentos realizados",
      );
    }

    await this.prisma.payable.delete({ where: { id } });
    return payable;
  }

  async cancel(id: string, organizationId: string) {
    const payable = await this.findOne(id, organizationId);

    if (payable.status === AccountStatus.PAID) {
      throw new BadRequestException(
        "Não é possível cancelar uma conta já paga",
      );
    }

    return this.prisma.payable.update({
      where: { id },
      data: { status: AccountStatus.CANCELLED },
    });
  }

  // Update overdue status - called by cron job
  async updateOverdueStatus(organizationId?: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const where: Prisma.PayableWhereInput = {
      dueDate: { lt: today },
      status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
      ...(organizationId && { organizationId }),
    };

    return this.prisma.payable.updateMany({
      where,
      data: { status: AccountStatus.OVERDUE },
    });
  }
}
