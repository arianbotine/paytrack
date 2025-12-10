import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, includeInactive = false) {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return customer;
  }

  async create(organizationId: string, createDto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        organizationId,
        ...createDto,
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateCustomerDto
  ) {
    await this.findOne(id, organizationId);

    return this.prisma.customer.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const customer = await this.findOne(id, organizationId);

    // Check if customer has receivables
    const hasReceivables = await this.prisma.receivable.count({
      where: { customerId: id },
    });

    if (hasReceivables > 0) {
      // Soft delete - just deactivate
      return this.prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await this.prisma.customer.delete({ where: { id } });
    return customer;
  }
}
