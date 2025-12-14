import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { BaseEntityService } from '../shared/base-entity.service';
import { Customer } from '@prisma/client';

@Injectable()
export class CustomersService extends BaseEntityService<
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Customer', prisma.customer, 'Cliente');
  }

  /**
   * Check if customer has related receivables
   */
  protected async checkIfInUse(id: string): Promise<boolean> {
    const count = await this.prisma.receivable.count({
      where: { customerId: id },
    });
    return count > 0;
  }

  /**
   * Customers ordered by name
   */
  protected getDefaultOrderBy() {
    return { name: 'asc' };
  }
}
