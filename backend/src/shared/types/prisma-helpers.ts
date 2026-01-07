import { Prisma } from '@prisma/client';

/**
 * Tipos auxiliares para evitar uso de 'any' nos módulos
 */

// Payable com installments incluídos
export type PayableWithInstallments = Prisma.PayableGetPayload<{
  include: {
    installments: {
      include: {
        allocations: true;
      };
    };
  };
}>;

// Receivable com installments incluídos
export type ReceivableWithInstallments = Prisma.ReceivableGetPayload<{
  include: {
    installments: {
      include: {
        allocations: true;
      };
    };
  };
}>;

// Installment básico com relações opcionais
export type PayableInstallmentWithRelations =
  Prisma.PayableInstallmentGetPayload<{
    include: {
      allocations: true;
      payable: true;
    };
  }>;

export type ReceivableInstallmentWithRelations =
  Prisma.ReceivableInstallmentGetPayload<{
    include: {
      allocations: true;
      receivable: true;
    };
  }>;

// Payment com allocations
export type PaymentWithAllocations = Prisma.PaymentGetPayload<{
  include: {
    allocations: {
      include: {
        payableInstallment: true;
        receivableInstallment: true;
      };
    };
  };
}>;

// Filtro dinâmico para queries
export type DynamicWhere<T> = {
  [K in keyof T]?: T[K] extends object ? DynamicWhere<T[K]> : T[K];
};
