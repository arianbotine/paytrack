import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';

/**
 * Dados para criar cliente de teste
 */
export interface CreateCustomerData {
  name?: string;
  document?: string;
  email?: string;
  phone?: string;
  organizationId: string;
  isActive?: boolean;
}

/**
 * Factory para criar clientes de teste
 */
export class CustomerFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um cliente de teste
   */
  async create(data: CreateCustomerData) {
    return this.prisma.customer.create({
      data: {
        id: randomUUID(),
        name: data.name || `Test Customer ${randomUUID().substring(0, 8)}`,
        document: data.document || this.generateRandomCPF(),
        email:
          data.email || `customer_${randomUUID().substring(0, 8)}@test.com`,
        phone: data.phone || this.generateRandomPhone(),
        organizationId: data.organizationId,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Cria múltiplos clientes
   */
  async createMany(count: number, data: CreateCustomerData) {
    const customers = [];

    for (let i = 0; i < count; i++) {
      const customer = await this.create({
        ...data,
        name: data.name || `Test Customer ${i + 1}`,
      });
      customers.push(customer);
    }

    return customers;
  }

  /**
   * Gera CPF aleatório para teste
   */
  private generateRandomCPF(): string {
    const random = () => Math.floor(Math.random() * 10);
    return `${random()}${random()}${random()}.${random()}${random()}${random()}.${random()}${random()}${random()}-${random()}${random()}`;
  }

  /**
   * Gera telefone aleatório para teste
   */
  private generateRandomPhone(): string {
    const random = () => Math.floor(Math.random() * 10);
    return `(${random()}${random()}) ${random()}${random()}${random()}${random()}${random()}-${random()}${random()}${random()}${random()}`;
  }
}
