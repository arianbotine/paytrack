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
    super(prisma, 'Customer', prisma.customer, 'Devedor');
  }

  /**
   * Verificar se devedor possui contas a receber relacionadas
   */
  protected async checkIfInUse(id: string): Promise<boolean> {
    const count = await this.prisma.receivable.count({
      where: { customerId: id },
    });
    return count > 0;
  }

  /**
   * Devedores ordenados por nome
   */
  protected getDefaultOrderBy() {
    return { name: 'asc' };
  }
}
