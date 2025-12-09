import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreatePayableDto, UpdatePayableDto, PayableFilterDto } from './dto/payable.dto';

@Injectable()
export class PayablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, filters?: PayableFilterDto) {
    const where: Prisma.PayableWhereInput = {
      organizationId,
      ...(filters?.vendorId && { vendorId: filters.vendorId }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.status && filters.status.length > 0 && { status: { in: filters.status } }),
      ...(filters?.dueDateFrom || filters?.dueDateTo
        ? {
            dueDate: {
              ...(filters?.dueDateFrom && { gte: new Date(filters.dueDateFrom) }),
              ...(filters?.dueDateTo && { lte: new Date(filters.dueDateTo) }),
            },
          }
        : {}),
    };

    return this.prisma.payable.findMany({
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
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
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
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    return payable;
  }

  async create(organizationId: string, createDto: CreatePayableDto) {
    const { tagIds, ...data } = createDto;

    const payable = await this.prisma.payable.create({
      data: {
        organizationId,
        vendorId: data.vendorId,
        categoryId: data.categoryId,
        description: data.description,
        amount: new Prisma.Decimal(data.amount),
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
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    return payable;
  }

  async update(id: string, organizationId: string, updateDto: UpdatePayableDto) {
    const payable = await this.findOne(id, organizationId);

    if (payable.status === AccountStatus.PAID) {
      throw new BadRequestException('Não é possível editar uma conta já paga');
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

    return this.prisma.payable.update({
      where: { id },
      data: {
        ...data,
        ...(data.amount && { amount: new Prisma.Decimal(data.amount) }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
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
  }

  async remove(id: string, organizationId: string) {
    const payable = await this.findOne(id, organizationId);

    if (payable.status === AccountStatus.PAID || payable.status === AccountStatus.PARTIAL) {
      throw new BadRequestException('Não é possível excluir uma conta com pagamentos realizados');
    }

    await this.prisma.payable.delete({ where: { id } });
    return payable;
  }

  async cancel(id: string, organizationId: string) {
    const payable = await this.findOne(id, organizationId);

    if (payable.status === AccountStatus.PAID) {
      throw new BadRequestException('Não é possível cancelar uma conta já paga');
    }

    return this.prisma.payable.update({
      where: { id },
      data: { status: AccountStatus.CANCELLED },
    });
  }

  // Update overdue status - called by cron job
  async updateOverdueStatus(organizationId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
