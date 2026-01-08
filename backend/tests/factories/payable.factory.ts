import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

/**
 * Dados para criar conta a pagar de teste
 */
export interface CreatePayableData {
  notes?: string;
  amount?: number;
  dueDate?: Date;
  installmentCount?: number;
  organizationId: string;
  vendorId: string;
  categoryId?: string;
  status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  tags?: string[];
  documentNumber?: string;
}

/**
 * Factory para criar contas a pagar de teste
 */
export class PayableFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma conta a pagar com parcelas
   */
  async create(data: CreatePayableData) {
    const installmentCount = data.installmentCount || 1;
    const amount = data.amount || 1000;
    const installmentAmount = amount / installmentCount;
    const baseDate = data.dueDate || new Date('2026-12-31');

    // Criar conta a pagar
    const payable = await this.prisma.payable.create({
      data: {
        id: randomUUID(),
        notes: data.notes || `Conta a Pagar ${randomUUID().substring(0, 8)}`,
        amount: new Prisma.Decimal(amount),
        organizationId: data.organizationId,
        vendorId: data.vendorId,
        categoryId: data.categoryId,
        status: data.status || 'PENDING',
        documentNumber: data.documentNumber,
        totalInstallments: installmentCount,
        installments: {
          create: Array.from({ length: installmentCount }, (_, index) => {
            const dueDate = new Date(baseDate);
            dueDate.setMonth(dueDate.getMonth() + index);

            return {
              id: randomUUID(),
              installmentNumber: index + 1,
              totalInstallments: installmentCount,
              amount: new Prisma.Decimal(installmentAmount),
              dueDate,
              status: data.status || 'PENDING',
              organizationId: data.organizationId,
            };
          }),
        },
        tags: data.tags
          ? {
              create: data.tags.map(tagId => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        installments: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return payable;
  }

  /**
   * Cria múltiplas contas a pagar
   */
  async createMany(count: number, data: CreatePayableData) {
    const payables = [];

    for (let i = 0; i < count; i++) {
      const payable = await this.create({
        ...data,
        notes: data.notes || `Conta a Pagar ${i + 1}`,
      });
      payables.push(payable);
    }

    return payables;
  }

  /**
   * Cria conta a pagar com status específico
   */
  async createWithStatus(
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED',
    data: CreatePayableData
  ) {
    return this.create({
      ...data,
      status,
    });
  }

  /**
   * Cria conta a pagar com múltiplas parcelas
   */
  async createWithInstallments(
    installmentCount: number,
    data: CreatePayableData
  ) {
    return this.create({
      ...data,
      installmentCount,
    });
  }
}
