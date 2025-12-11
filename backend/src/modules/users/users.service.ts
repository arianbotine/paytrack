import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    // Find all users associated with this organization via junction table
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isSystemAdmin: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return userOrganizations.map(uo => ({
      id: uo.user.id,
      email: uo.user.email,
      name: uo.user.name,
      role: uo.role,
      isSystemAdmin: uo.user.isSystemAdmin,
      isActive: uo.isActive && uo.user.isActive,
      createdAt: uo.user.createdAt,
      updatedAt: uo.user.updatedAt,
    }));
  }

  async findOne(id: string, organizationId: string) {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: id,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isSystemAdmin: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!userOrganization) {
      throw new NotFoundException('Usuário não encontrado nesta organização');
    }

    return {
      id: userOrganization.user.id,
      email: userOrganization.user.email,
      name: userOrganization.user.name,
      role: userOrganization.role,
      isSystemAdmin: userOrganization.user.isSystemAdmin,
      isActive: userOrganization.isActive && userOrganization.user.isActive,
      createdAt: userOrganization.user.createdAt,
      updatedAt: userOrganization.user.updatedAt,
    };
  }

  async create(organizationId: string, createDto: CreateUserDto) {
    // Check if email already exists globally
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado no sistema');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    // Create user and associate with organization in a transaction
    const result = await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email: createDto.email,
          password: hashedPassword,
          name: createDto.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isSystemAdmin: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const userOrg = await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId,
          role: createDto.role,
        },
      });

      return { user, role: userOrg.role };
    });

    return {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.role,
      isSystemAdmin: result.user.isSystemAdmin,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
    };
  }

  async update(id: string, organizationId: string, updateDto: UpdateUserDto) {
    // Verify user is in this organization
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: id, organizationId },
    });

    if (!userOrg) {
      throw new NotFoundException('Usuário não encontrado nesta organização');
    }

    // Check if email already exists (if changing email)
    if (updateDto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateDto.email,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email já cadastrado no sistema');
      }
    }

    const result = await this.prisma.$transaction(async tx => {
      const userData: Prisma.UserUpdateInput = {};

      if (updateDto.email) userData.email = updateDto.email;
      if (updateDto.name) userData.name = updateDto.name;
      if (updateDto.password) {
        userData.password = await bcrypt.hash(updateDto.password, 10);
      }
      if (updateDto.isActive !== undefined)
        userData.isActive = updateDto.isActive;

      const user = await tx.user.update({
        where: { id },
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          isSystemAdmin: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Update role in organization if provided
      if (updateDto.role) {
        await tx.userOrganization.update({
          where: {
            userId_organizationId: {
              userId: id,
              organizationId,
            },
          },
          data: { role: updateDto.role },
        });
      }

      const updatedUserOrg = await tx.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: id,
            organizationId,
          },
        },
      });

      return { user, role: updatedUserOrg!.role };
    });

    return {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.role,
      isSystemAdmin: result.user.isSystemAdmin,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
    };
  }

  async remove(id: string, organizationId: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ConflictException('Você não pode excluir seu próprio usuário');
    }

    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: id, organizationId },
      include: { user: true },
    });

    if (!userOrg) {
      throw new NotFoundException('Usuário não encontrado nesta organização');
    }

    // Remove association from organization
    await this.prisma.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId: id,
          organizationId,
        },
      },
    });

    return {
      id: userOrg.user.id,
      email: userOrg.user.email,
      name: userOrg.user.name,
      role: userOrg.role,
    };
  }

  // New method for user self-update
  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Check if email already exists (if changing email)
    if (updateDto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateDto.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email já cadastrado no sistema');
      }
    }

    const userData: Prisma.UserUpdateInput = {};

    if (updateDto.email) userData.email = updateDto.email;
    if (updateDto.name) userData.name = updateDto.name;
    if (updateDto.password) {
      userData.password = await bcrypt.hash(updateDto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        isSystemAdmin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  // System admin methods
  async createSystemUser(createDto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado no sistema');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createDto.email,
        password: hashedPassword,
        name: createDto.name,
        isSystemAdmin: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isSystemAdmin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async associateUserWithOrganization(
    userId: string,
    organizationId: string,
    role: UserRole
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada');
    }

    // Check if association already exists
    const existing = await this.prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Usuário já associado a esta organização');
    }

    const userOrg = await this.prisma.userOrganization.create({
      data: {
        userId,
        organizationId,
        role,
      },
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
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      id: userOrg.user.id,
      email: userOrg.user.email,
      name: userOrg.user.name,
      role: userOrg.role,
      isSystemAdmin: userOrg.user.isSystemAdmin,
      isActive: userOrg.isActive && userOrg.user.isActive,
      organization: {
        id: userOrg.organization.id,
        name: userOrg.organization.name,
      },
    };
  }

  async dissociateUserFromOrganization(userId: string, organizationId: string) {
    const userOrg = await this.prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!userOrg) {
      throw new NotFoundException(
        'Associação não encontrada entre usuário e organização'
      );
    }

    await this.prisma.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    return {
      id: userOrg.user.id,
      email: userOrg.user.email,
      name: userOrg.user.name,
      organization: {
        id: userOrg.organization.id,
        name: userOrg.organization.name,
      },
    };
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isSystemAdmin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isSystemAdmin: user.isSystemAdmin,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organizations: user.organizations.map(uo => ({
        id: uo.organization.id,
        name: uo.organization.name,
        role: uo.role,
      })),
    }));
  }
}
