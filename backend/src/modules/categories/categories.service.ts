import { Injectable, ConflictException } from '@nestjs/common';
import { CategoryType, Category } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { BaseEntityService } from '../shared/base-entity.service';

@Injectable()
export class CategoriesService extends BaseEntityService<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Category', prisma.category, 'Categoria');
  }

  /**
   * Find all categories, optionally filtered by type
   */
  async findAll(
    organizationId: string,
    includeInactive = false,
    type?: CategoryType
  ) {
    const where: any = { organizationId };

    if (type) {
      where.type = type;
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            payables: true,
            receivables: true,
          },
        },
      },
    });
  }

  /**
   * Check for unique name+type constraint
   */
  protected async checkUniqueConstraints(
    organizationId: string,
    dto: Partial<CreateCategoryDto | UpdateCategoryDto>,
    excludeId?: string
  ): Promise<void> {
    if (!dto.name) return;

    // For create, we need the type from dto
    // For update, we need to fetch current category to get type
    let type: CategoryType;

    if ('type' in dto && dto.type) {
      type = dto.type;
    } else if (excludeId) {
      const current = await this.prisma.category.findUnique({
        where: { id: excludeId },
      });
      if (!current) return;
      type = current.type;
    } else {
      return;
    }

    const where: any = {
      organizationId,
      name: dto.name,
      type,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const existing = await this.prisma.category.findFirst({ where });

    if (existing) {
      throw new ConflictException('Categoria já existe com este nome');
    }
  }

  /**
   * Check if category is in use
   */
  protected async checkIfInUse(id: string): Promise<boolean> {
    const usageCount =
      (await this.prisma.payable.count({ where: { categoryId: id } })) +
      (await this.prisma.receivable.count({ where: { categoryId: id } }));

    return usageCount > 0;
  }

  /**
   * Categories ordered by name
   */
  protected getDefaultOrderBy() {
    return { name: 'asc' };
  }
}
