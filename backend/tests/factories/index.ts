export * from './category.factory';
export * from './vendor.factory';
export * from './customer.factory';
export * from './tag.factory';
export * from './payable.factory';
export * from './receivable.factory';
export * from './payment.factory';

// Helper functions for quick test creation
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { PayableFactory } from './payable.factory';
import { ReceivableFactory } from './receivable.factory';
import { TagFactory } from './tag.factory';
import { VendorFactory } from './vendor.factory';
import { CustomerFactory } from './customer.factory';

export async function createTestPayableWithInstallments(
  prisma: PrismaService,
  organizationId: string,
  options?: {
    installmentCount?: number;
    amount?: number;
  }
) {
  const vendorFactory = new VendorFactory(prisma);
  const vendor = await vendorFactory.create({ organizationId });

  const payableFactory = new PayableFactory(prisma);
  return payableFactory.create({
    organizationId,
    vendorId: vendor.id,
    installmentCount: options?.installmentCount || 1,
    amount: options?.amount || 1000,
  });
}

export async function createTestReceivableWithInstallments(
  prisma: PrismaService,
  organizationId: string,
  options?: {
    installmentCount?: number;
    amount?: number;
  }
) {
  const customerFactory = new CustomerFactory(prisma);
  const customer = await customerFactory.create({ organizationId });

  const receivableFactory = new ReceivableFactory(prisma);
  return receivableFactory.create({
    organizationId,
    customerId: customer.id,
    installmentCount: options?.installmentCount || 1,
    amount: options?.amount || 1000,
  });
}

export async function createTestTag(
  prisma: PrismaService,
  organizationId: string,
  options?: { name?: string; color?: string }
) {
  const tagFactory = new TagFactory(prisma);
  return tagFactory.create({
    organizationId,
    name: options?.name,
    color: options?.color,
  });
}
