import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { BaseEntityService } from '../shared/base-entity.service';
import { Tag } from '@prisma/client';

@Injectable()
export class TagsService extends BaseEntityService<
  Tag,
  CreateTagDto,
  UpdateTagDto
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Tag', prisma.tag, 'Tag');
  }

  /**
   * Override findAll to include count of related payables and receivables
   */
  async findAll(organizationId: string): Promise<any> {
    try {
      return await this.prisma.tag.findMany({
        where: { organizationId },
        orderBy: this.getDefaultOrderBy(),
        include: {
          _count: {
            select: {
              payables: true,
              receivables: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error finding tags:', error);
      throw error;
    }
  }

  /**
   * Check for unique name constraint
   */
  protected async checkUniqueConstraints(
    organizationId: string,
    dto: Partial<CreateTagDto | UpdateTagDto>,
    excludeId?: string
  ): Promise<void> {
    if (!dto.name) return;

    const where: any = {
      organizationId,
      name: dto.name,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const existing = await this.prisma.tag.findFirst({ where });

    if (existing) {
      throw new ConflictException('Tag já existe com este nome');
    }
  }

  /**
   * Check if tag is in use
   */
  protected async checkIfInUse(id: string): Promise<boolean> {
    const usageCount =
      (await this.prisma.payable.count({
        where: { tags: { some: { tagId: id } } },
      })) +
      (await this.prisma.receivable.count({
        where: { tags: { some: { tagId: id } } },
      }));

    return usageCount > 0;
  }

  /**
   * Tags ordered by name
   */
  protected getDefaultOrderBy() {
    return { name: 'asc' as const };
  }
}
