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
   * Tags ordered by name
   */
  protected getDefaultOrderBy() {
    return { name: 'asc' };
  }
}
