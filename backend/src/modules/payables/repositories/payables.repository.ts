import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Repository responsável apenas por operações de acesso a dados de Payables
 * Segue o padrão Repository para isolar a camada de persistência
 */
@Injectable()
export class PayablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.PayableWhereInput,
    options?: {
      include?: Prisma.PayableInclude;
      orderBy?: Prisma.PayableOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    }
  ) {
    return this.prisma.payable.findMany({
      where,
      ...options,
    });
  }

  async findFirst(
    where: Prisma.PayableWhereInput,
    include?: Prisma.PayableInclude
  ) {
    return this.prisma.payable.findFirst({
      where,
      include,
    });
  }

  async count(where: Prisma.PayableWhereInput) {
    return this.prisma.payable.count({ where });
  }

  async create(data: Prisma.PayableCreateInput) {
    return this.prisma.payable.create({ data });
  }

  async update(
    where: Prisma.PayableWhereUniqueInput,
    data: Prisma.PayableUpdateInput
  ) {
    return this.prisma.payable.update({ where, data });
  }

  async delete(where: Prisma.PayableWhereUniqueInput) {
    return this.prisma.payable.delete({ where });
  }

  async transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}
