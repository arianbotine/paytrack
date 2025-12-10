import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.tag.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId },
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    return tag;
  }

  async create(organizationId: string, createDto: CreateTagDto) {
    const existing = await this.prisma.tag.findFirst({
      where: { organizationId, name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Tag já existe com este nome');
    }

    return this.prisma.tag.create({
      data: {
        organizationId,
        ...createDto,
      },
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdateTagDto) {
    const tag = await this.findOne(id, organizationId);

    if (updateDto.name && updateDto.name !== tag.name) {
      const existing = await this.prisma.tag.findFirst({
        where: {
          organizationId,
          name: updateDto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Tag já existe com este nome');
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const tag = await this.findOne(id, organizationId);

    await this.prisma.tag.delete({ where: { id } });
    return tag;
  }
}
