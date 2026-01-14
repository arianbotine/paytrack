import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

/**
 * Dados para criar conta a receber de teste
 */
export interface CreateReceivableData {
  notes?: string;
  amount?: number;
  dueDate?: Date;
  installmentCount?: number;
  organizationId: string;
  customerId: string;
  categoryId?: string;
  status?: 'PENDING' | 'PARTIAL' | 'PAID';
  tags?: string[];
}

/**
 * Factory para criar contas a receber de teste
 */
export class ReceivableFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma conta a receber com parcelas
   */
  async create(data: CreateReceivableData) {
    const installmentCount = data.installmentCount || 1;
    const amount = data.amount || 1000;
    const installmentAmount = amount / installmentCount;
    const baseDate = data.dueDate || new Date('2026-12-31');

    // Criar conta a receber
    const receivable = await this.prisma.receivable.create({
      data: {
        id: randomUUID(),
        notes: data.notes || `Conta a Receber ${randomUUID().substring(0, 8)}`,
        amount: new Prisma.Decimal(amount),
        organizationId: data.organizationId,
        customerId: data.customerId,
        categoryId: data.categoryId,
        status: data.status || 'PENDING',
        totalInstallments: installmentCount,
        tags: data.tags
          ? {
              create: data.tags.map(tagId => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Criar parcelas
    const installments = [];
    for (let index = 0; index < installmentCount; index++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + index);

      const installment = await this.prisma.receivableInstallment.create({
        data: {
          id: randomUUID(),
          receivableId: receivable.id,
          installmentNumber: index + 1,
          totalInstallments: installmentCount,
          amount: new Prisma.Decimal(installmentAmount),
          dueDate,
          status: data.status || 'PENDING',
          organizationId: data.organizationId,
        },
      });
      installments.push(installment);
    }

    return {
      ...receivable,
      installments,
    };
  }

  /**
   * Cria múltiplas contas a receber
   */
  async createMany(count: number, data: CreateReceivableData) {
    const receivables = [];

    for (let i = 0; i < count; i++) {
      const receivable = await this.create({
        ...data,
        notes: data.notes || `Conta a Receber ${i + 1}`,
      });
      receivables.push(receivable);
    }

    return receivables;
  }

  /**
   * Cria conta a receber com status específico
   */
  async createWithStatus(
    status: 'PENDING' | 'PARTIAL' | 'PAID',
    data: CreateReceivableData
  ) {
    return this.create({
      ...data,
      status,
    });
  }

  /**
   * Cria conta a receber com múltiplas parcelas
   */
  async createWithInstallments(
    installmentCount: number,
    data: CreateReceivableData
  ) {
    return this.create({
      ...data,
      installmentCount,
    });
  }
}
