import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Repository para operações de itens de parcelas de contas a pagar.
 */
@Injectable()
export class PayableInstallmentItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.PayableInstallmentItemWhereInput,
    options?: {
      include?: Prisma.PayableInstallmentItemInclude;
      orderBy?: Prisma.PayableInstallmentItemOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    }
  ) {
    return this.prisma.payableInstallmentItem.findMany({
      where,
      ...options,
    });
  }

  async findFirst(
    where: Prisma.PayableInstallmentItemWhereInput,
    include?: Prisma.PayableInstallmentItemInclude
  ) {
    return this.prisma.payableInstallmentItem.findFirst({
      where,
      include,
    });
  }

  async create(data: Prisma.PayableInstallmentItemCreateInput) {
    return this.prisma.payableInstallmentItem.create({ data });
  }

  async update(
    where: Prisma.PayableInstallmentItemWhereUniqueInput,
    data: Prisma.PayableInstallmentItemUpdateInput
  ) {
    return this.prisma.payableInstallmentItem.update({ where, data });
  }

  async delete(where: Prisma.PayableInstallmentItemWhereUniqueInput) {
    return this.prisma.payableInstallmentItem.delete({ where });
  }

  async aggregate(args: Prisma.PayableInstallmentItemAggregateArgs) {
    return this.prisma.payableInstallmentItem.aggregate(args);
  }
}
