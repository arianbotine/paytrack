import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

/**
 * Dados para criar alocação de pagamento
 */
export interface CreateAllocationData {
  // Formato antigo (ainda aceito)
  accountType?: 'PAYABLE' | 'RECEIVABLE';
  accountId?: string;
  installmentId?: string;
  // Formato novo (preferível)
  payableInstallmentId?: string;
  receivableInstallmentId?: string;
  amount: number;
}

/**
 * Dados para criar pagamento de teste
 */
export interface CreatePaymentData {
  amount?: number;
  paymentDate?: Date;
  notes?: string;
  paymentMethod?:
    | 'CASH'
    | 'DEBIT_CARD'
    | 'CREDIT_CARD'
    | 'BANK_TRANSFER'
    | 'PIX'
    | 'CHECK'
    | 'OTHER';
  organizationId: string;
  allocations?: CreateAllocationData[];
}

/**
 * Factory para criar pagamentos de teste
 */
export class PaymentFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um pagamento com alocações
   */
  async create(data: CreatePaymentData) {
    const amount = data.amount || 1000;
    const paymentDate = data.paymentDate || new Date();

    const payment = await this.prisma.payment.create({
      data: {
        id: randomUUID(),
        amount: new Prisma.Decimal(amount),
        paymentDate,
        notes: data.notes || `Pagamento ${randomUUID().substring(0, 8)}`,
        paymentMethod: data.paymentMethod || 'PIX',
        organizationId: data.organizationId,
        allocations: data.allocations
          ? {
              create: data.allocations.map(allocation => ({
                id: randomUUID(),
                payableInstallmentId:
                  allocation.payableInstallmentId ||
                  (allocation.accountType === 'PAYABLE'
                    ? allocation.installmentId
                    : undefined),
                receivableInstallmentId:
                  allocation.receivableInstallmentId ||
                  (allocation.accountType === 'RECEIVABLE'
                    ? allocation.installmentId
                    : undefined),
                amount: new Prisma.Decimal(allocation.amount),
              })),
            }
          : undefined,
      },
      include: {
        allocations: true,
      },
    });

    return payment;
  }

  /**
   * Cria múltiplos pagamentos
   */
  async createMany(count: number, data: CreatePaymentData) {
    const payments = [];

    for (let i = 0; i < count; i++) {
      const payment = await this.create({
        ...data,
        notes: data.notes || `Pagamento ${i + 1}`,
      });
      payments.push(payment);
    }

    return payments;
  }

  /**
   * Cria pagamento para uma parcela específica
   */
  async createForInstallment(
    accountType: 'PAYABLE' | 'RECEIVABLE',
    accountId: string,
    installmentId: string,
    amount: number,
    organizationId: string
  ) {
    return this.create({
      amount,
      organizationId,
      allocations: [
        {
          accountType,
          accountId,
          installmentId,
          amount,
        },
      ],
    });
  }

  /**
   * Cria pagamento com múltiplas alocações
   */
  async createWithMultipleAllocations(
    allocations: CreateAllocationData[],
    organizationId: string
  ) {
    const totalAmount = allocations.reduce(
      (sum, alloc) => sum + alloc.amount,
      0
    );

    return this.create({
      amount: totalAmount,
      organizationId,
      allocations,
    });
  }
}
