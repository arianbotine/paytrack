import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Repository para operações de pagamentos
 */
@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.PaymentWhereInput,
    options?: {
      include?: Prisma.PaymentInclude;
      orderBy?: Prisma.PaymentOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    }
  ) {
    return this.prisma.payment.findMany({
      where,
      ...options,
    });
  }

  async findFirst(
    where: Prisma.PaymentWhereInput,
    include?: Prisma.PaymentInclude
  ) {
    return this.prisma.payment.findFirst({
      where,
      include,
    });
  }

  async count(where: Prisma.PaymentWhereInput) {
    return this.prisma.payment.count({ where });
  }

  async create(
    data: Prisma.PaymentCreateInput,
    include?: Prisma.PaymentInclude
  ) {
    return this.prisma.payment.create({ data, include });
  }

  async delete(where: Prisma.PaymentWhereUniqueInput) {
    return this.prisma.payment.delete({ where });
  }

  async transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}
