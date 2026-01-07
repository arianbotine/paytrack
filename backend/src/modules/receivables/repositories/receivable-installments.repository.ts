import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository para acesso a dados de ReceivableInstallments
 * Responsabilidade: Isolar acesso ao Prisma
 */
@Injectable()
export class ReceivableInstallmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.ReceivableInstallmentWhereInput,
    orderBy?: Prisma.ReceivableInstallmentOrderByWithRelationInput
  ) {
    return this.prisma.receivableInstallment.findMany({
      where,
      orderBy,
    });
  }

  async createMany(data: Prisma.ReceivableInstallmentCreateManyInput[]) {
    return this.prisma.receivableInstallment.createMany({
      data,
    });
  }

  async deleteMany(where: Prisma.ReceivableInstallmentWhereInput) {
    return this.prisma.receivableInstallment.deleteMany({ where });
  }

  async update(
    where: Prisma.ReceivableInstallmentWhereUniqueInput,
    data: Prisma.ReceivableInstallmentUpdateInput
  ) {
    return this.prisma.receivableInstallment.update({ where, data });
  }

  async updateMany(
    where: Prisma.ReceivableInstallmentWhereInput,
    data: Prisma.ReceivableInstallmentUpdateInput
  ) {
    return this.prisma.receivableInstallment.updateMany({ where, data });
  }

  async delete(where: Prisma.ReceivableInstallmentWhereUniqueInput) {
    return this.prisma.receivableInstallment.delete({ where });
  }
}
