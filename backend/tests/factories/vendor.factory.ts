import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';

/**
 * Dados para criar fornecedor de teste
 */
export interface CreateVendorData {
  name?: string;
  document?: string;
  email?: string;
  phone?: string;
  organizationId: string;
  isActive?: boolean;
}

/**
 * Factory para criar fornecedores de teste
 */
export class VendorFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um fornecedor de teste
   */
  async create(data: CreateVendorData) {
    return this.prisma.vendor.create({
      data: {
        id: randomUUID(),
        name: data.name || `Test Vendor ${randomUUID().substring(0, 8)}`,
        document: data.document || this.generateRandomCNPJ(),
        email: data.email || `vendor_${randomUUID().substring(0, 8)}@test.com`,
        phone: data.phone || this.generateRandomPhone(),
        organizationId: data.organizationId,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Cria múltiplos fornecedores
   */
  async createMany(count: number, data: CreateVendorData) {
    const vendors = [];

    for (let i = 0; i < count; i++) {
      const vendor = await this.create({
        ...data,
        name: data.name || `Test Vendor ${i + 1}`,
      });
      vendors.push(vendor);
    }

    return vendors;
  }

  /**
   * Gera CNPJ aleatório para teste
   */
  private generateRandomCNPJ(): string {
    const random = () => Math.floor(Math.random() * 10);
    return `${random()}${random()}.${random()}${random()}${random()}.${random()}${random()}${random()}/${random()}${random()}${random()}${random()}-${random()}${random()}`;
  }

  /**
   * Gera telefone aleatório para teste
   */
  private generateRandomPhone(): string {
    const random = () => Math.floor(Math.random() * 10);
    return `(${random()}${random()}) ${random()}${random()}${random()}${random()}${random()}-${random()}${random()}${random()}${random()}`;
  }
}
