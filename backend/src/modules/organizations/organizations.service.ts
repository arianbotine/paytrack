import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada');
    }

    return organization;
  }

  async update(id: string, updateDto: UpdateOrganizationDto) {
    // Find the current organization
    const currentOrg = await this.findOne(id);

    // Check if document is being changed and if it already exists in another organization
    if (
      updateDto.document !== undefined &&
      updateDto.document !== currentOrg.document
    ) {
      if (updateDto.document?.trim()) {
        const existing = await this.prisma.organization.findFirst({
          where: {
            document: updateDto.document.trim(),
            id: { not: id }, // Exclude the current organization
          },
        });

        if (existing) {
          throw new ConflictException(
            'CNPJ já cadastrado em outra organização'
          );
        }
      }
    }

    try {
      return await this.prisma.organization.update({
        where: { id },
        data: {
          ...updateDto,
          document: updateDto.document?.trim() || null,
        },
      });
    } catch (error) {
      // Handle Prisma unique constraint errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes('document')
      ) {
        throw new ConflictException('CNPJ já cadastrado em outra organização');
      }
      throw error;
    }
  }

  // System admin methods
  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            payables: true,
            receivables: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(createDto: CreateOrganizationDto) {
    // Check if document already exists (only if document is provided and not empty)
    if (createDto.document?.trim()) {
      const existing = await this.prisma.organization.findUnique({
        where: { document: createDto.document.trim() },
      });

      if (existing) {
        throw new ConflictException('CNPJ já cadastrado');
      }
    }

    try {
      return await this.prisma.organization.create({
        data: {
          ...createDto,
          document: createDto.document || null,
        },
      });
    } catch (error) {
      // Handle Prisma unique constraint errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes('document')
      ) {
        throw new ConflictException('CNPJ já cadastrado');
      }
      throw error;
    }
  }

  async getOrganizationWithUsers(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isSystemAdmin: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada');
    }

    return {
      ...organization,
      users: organization.users.map(uo => ({
        id: uo.user.id,
        email: uo.user.email,
        name: uo.user.name,
        role: uo.role,
        isSystemAdmin: uo.user.isSystemAdmin,
        isActive: uo.isActive && uo.user.isActive,
      })),
    };
  }
}
