import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import { CategoryType } from '@prisma/client';

/**
 * Dados para criar categoria de teste
 */
export interface CreateCategoryData {
  name?: string;
  type?: CategoryType;
  organizationId: string;
  isActive?: boolean;
}

/**
 * Factory para criar categorias de teste
 */
export class CategoryFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma categoria de teste
   */
  async create(data: CreateCategoryData) {
    return this.prisma.category.create({
      data: {
        id: randomUUID(),
        name: data.name || `Test Category ${randomUUID().substring(0, 8)}`,
        type: data.type || CategoryType.PAYABLE,
        organizationId: data.organizationId,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Cria múltiplas categorias
   */
  async createMany(count: number, data: CreateCategoryData) {
    const categories = [];

    for (let i = 0; i < count; i++) {
      const category = await this.create({
        ...data,
        name: data.name || `Test Category ${i + 1}`,
      });
      categories.push(category);
    }

    return categories;
  }

  /**
   * Cria categorias dos dois tipos
   */
  async createBothTypes(organizationId: string) {
    return Promise.all([
      this.create({
        organizationId,
        type: CategoryType.PAYABLE,
        name: 'Payable Category',
      }),
      this.create({
        organizationId,
        type: CategoryType.RECEIVABLE,
        name: 'Receivable Category',
      }),
    ]);
  }
}
