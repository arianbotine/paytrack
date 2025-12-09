import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return users;
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async create(organizationId: string, createDto: CreateUserDto) {
    // Check if email already exists in this organization
    const existingUser = await this.prisma.user.findFirst({
      where: { organizationId, email: createDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado nesta organização');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: createDto.email,
        password: hashedPassword,
        name: createDto.name,
        role: createDto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async update(id: string, organizationId: string, updateDto: UpdateUserDto) {
    await this.findOne(id, organizationId);

    // Check if email already exists
    if (updateDto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          organizationId,
          email: updateDto.email,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email já cadastrado nesta organização');
      }
    }

    const data: any = { ...updateDto };

    if (updateDto.password) {
      data.password = await bcrypt.hash(updateDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, organizationId: string, currentUserId: string) {
    const user = await this.findOne(id, organizationId);

    if (id === currentUserId) {
      throw new ConflictException('Você não pode excluir seu próprio usuário');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return user;
  }
}
