import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Repository para operações de parcelas de contas a pagar
 */
@Injectable()
export class PayableInstallmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.PayableInstallmentWhereInput,
    options?: {
      include?: Prisma.PayableInstallmentInclude;
      orderBy?: Prisma.PayableInstallmentOrderByWithRelationInput[];
    }
  ) {
    return this.prisma.payableInstallment.findMany({
      where,
      ...options,
    });
  }

  async findUnique(
    where: Prisma.PayableInstallmentWhereUniqueInput,
    include?: Prisma.PayableInstallmentInclude
  ) {
    return this.prisma.payableInstallment.findUnique({
      where,
      include,
    });
  }

  async createMany(data: Prisma.PayableInstallmentCreateManyInput[]) {
    return this.prisma.payableInstallment.createMany({ data });
  }

  async update(
    where: Prisma.PayableInstallmentWhereUniqueInput,
    data: Prisma.PayableInstallmentUpdateInput
  ) {
    return this.prisma.payableInstallment.update({ where, data });
  }

  async updateMany(
    where: Prisma.PayableInstallmentWhereInput,
    data: Prisma.PayableInstallmentUpdateInput
  ) {
    return this.prisma.payableInstallment.updateMany({ where, data });
  }

  async deleteMany(where: Prisma.PayableInstallmentWhereInput) {
    return this.prisma.payableInstallment.deleteMany({ where });
  }
}
