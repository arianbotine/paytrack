import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, type?: CategoryType, includeInactive = false) {
    return this.prisma.category.findMany({
      where: {
        organizationId,
        ...(type ? { type } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async create(organizationId: string, createDto: CreateCategoryDto) {
    // Check if category with same name and type already exists
    const existing = await this.prisma.category.findFirst({
      where: {
        organizationId,
        name: createDto.name,
        type: createDto.type,
      },
    });

    if (existing) {
      throw new ConflictException('Categoria já existe com este nome');
    }

    return this.prisma.category.create({
      data: {
        organizationId,
        ...createDto,
      },
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdateCategoryDto) {
    const category = await this.findOne(id, organizationId);

    // Check if name is being changed and if it conflicts
    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.prisma.category.findFirst({
        where: {
          organizationId,
          name: updateDto.name,
          type: category.type,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Categoria já existe com este nome');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const category = await this.findOne(id, organizationId);

    // Check usage
    const usageCount = await this.prisma.payable.count({
      where: { categoryId: id },
    }) + await this.prisma.receivable.count({
      where: { categoryId: id },
    });

    if (usageCount > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await this.prisma.category.delete({ where: { id } });
    return category;
  }
}
