import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository para acesso a dados de Receivables
 * Responsabilidade: Isolar acesso ao Prisma
 */
@Injectable()
export class ReceivablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.ReceivableWhereInput,
    options?: { skip?: number; take?: number; orderBy?: any; include?: any }
  ) {
    return this.prisma.receivable.findMany({
      where,
      ...options,
    });
  }

  async findFirst(
    where: Prisma.ReceivableWhereInput,
    include?: Prisma.ReceivableInclude
  ) {
    return this.prisma.receivable.findFirst({
      where,
      include,
    });
  }

  async count(where: Prisma.ReceivableWhereInput) {
    return this.prisma.receivable.count({ where });
  }

  async create(data: Prisma.ReceivableCreateInput) {
    return this.prisma.receivable.create({ data });
  }

  async update(
    where: Prisma.ReceivableWhereUniqueInput,
    data: Prisma.ReceivableUpdateInput
  ) {
    return this.prisma.receivable.update({ where, data });
  }

  async delete(where: Prisma.ReceivableWhereUniqueInput) {
    return this.prisma.receivable.delete({ where });
  }

  async transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}
