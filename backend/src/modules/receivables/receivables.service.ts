import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AccountStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
} from "./dto/receivable.dto";
import { MoneyUtils } from "../../shared/utils/money.utils";

@Injectable()
export class ReceivablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
    const where: Prisma.ReceivableWhereInput = {
      organizationId,
      ...(filters?.customerId && { customerId: filters.customerId }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.status &&
        filters.status.length > 0 && { status: { in: filters.status } }),
      ...(filters?.dueDateFrom || filters?.dueDateTo
        ? {
            dueDate: {
              ...(filters?.dueDateFrom && {
                gte: new Date(filters.dueDateFrom),
              }),
              ...(filters?.dueDateTo && { lte: new Date(filters.dueDateTo) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.receivable.findMany({
        where,
        include: {
          customer: {
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
      this.prisma.receivable.count({ where }),
    ]);

    // Transform Decimal fields to numbers for JSON serialization
    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      "amount",
      "paidAmount",
    ]);

    return { data: transformedData, total };
  }

  async findOne(id: string, organizationId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
      include: {
        customer: {
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

    if (!receivable) {
      throw new NotFoundException("Conta a receber não encontrada");
    }

    // Transform Decimal fields to numbers for JSON serialization
    return MoneyUtils.transformMoneyFields(receivable, [
      "amount",
      "paidAmount",
    ]);
  }

  async create(organizationId: string, createDto: CreateReceivableDto) {
    const { tagIds, ...data } = createDto;

    const receivable = await this.prisma.receivable.create({
      data: {
        organizationId,
        customerId: data.customerId,
        categoryId: data.categoryId,
        description: data.description,
        amount: MoneyUtils.toDecimal(data.amount),
        dueDate: new Date(data.dueDate),
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        documentNumber: data.documentNumber,
        ...(tagIds && tagIds.length > 0
          ? {
              tags: {
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    return receivable;
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateReceivableDto
  ) {
    const receivable = await this.findOne(id, organizationId);

    if (receivable.status === AccountStatus.PAID) {
      throw new BadRequestException(
        "Não é possível editar uma conta já recebida"
      );
    }

    const { tagIds, ...data } = updateDto;

    // Handle tags update
    if (tagIds !== undefined) {
      await this.prisma.receivableTag.deleteMany({
        where: { receivableId: id },
      });

      if (tagIds.length > 0) {
        await this.prisma.receivableTag.createMany({
          data: tagIds.map((tagId) => ({ receivableId: id, tagId })),
        });
      }
    }

    return this.prisma.receivable.update({
      where: { id },
      data: {
        ...data,
        ...(data.amount && { amount: MoneyUtils.toDecimal(data.amount) }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      },
      include: {
        customer: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const receivable = await this.findOne(id, organizationId);

    if (
      receivable.status === AccountStatus.PAID ||
      receivable.status === AccountStatus.PARTIAL
    ) {
      throw new BadRequestException(
        "Não é possível excluir uma conta com recebimentos realizados"
      );
    }

    await this.prisma.receivable.delete({ where: { id } });
    return receivable;
  }

  async cancel(id: string, organizationId: string) {
    const receivable = await this.findOne(id, organizationId);

    if (receivable.status === AccountStatus.PAID) {
      throw new BadRequestException(
        "Não é possível cancelar uma conta já recebida"
      );
    }

    return this.prisma.receivable.update({
      where: { id },
      data: { status: AccountStatus.CANCELLED },
    });
  }

  // Update overdue status - called by cron job
  async updateOverdueStatus(organizationId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.ReceivableWhereInput = {
      dueDate: { lt: today },
      status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
      ...(organizationId && { organizationId }),
    };

    return this.prisma.receivable.updateMany({
      where,
      data: { status: AccountStatus.OVERDUE },
    });
  }
}
