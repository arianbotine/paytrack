import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
    await this.findOne(id);

    return this.prisma.organization.update({
      where: { id },
      data: updateDto,
    });
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
    // Check if document already exists
    if (createDto.document) {
      const existing = await this.prisma.organization.findUnique({
        where: { document: createDto.document },
      });

      if (existing) {
        throw new ConflictException('CNPJ já cadastrado');
      }
    }

    return this.prisma.organization.create({
      data: createDto,
    });
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
