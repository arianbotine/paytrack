import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
} from './dto/receivable.dto';
import { BaseAccountService } from '../shared/base-account.service';

@Injectable()
export class ReceivablesService extends BaseAccountService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.receivable;
  }

  protected getEntityName() {
    return 'conta a receber';
  }

  protected getIncludeOptions() {
    return {
      customer: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    };
  }

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
    const result = await this.findAllBase(organizationId, filters, {
      ...(filters?.customerId && { customerId: filters.customerId }),
    });

    // Map paidAmount to receivedAmount for frontend compatibility
    const mappedData = result.data.map((receivable: any) => ({
      ...receivable,
      receivedAmount: receivable.paidAmount,
      paidAmount: undefined,
    }));

    return { data: mappedData, total: result.total };
  }

  async findOne(id: string, organizationId: string) {
    const receivable = await this.findOneBase(id, organizationId);

    // Map paidAmount to receivedAmount for frontend compatibility
    return {
      ...receivable,
      receivedAmount: receivable.paidAmount,
      paidAmount: undefined,
    };
  }

  async create(organizationId: string, createDto: CreateReceivableDto) {
    const result = await this.createBase(organizationId, createDto);

    // Map paidAmount to receivedAmount for frontend compatibility
    return {
      ...result,
      receivedAmount: result.paidAmount,
      paidAmount: undefined,
    };
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateReceivableDto
  ) {
    const result = await this.updateBase(
      id,
      organizationId,
      updateDto,
      this.prisma.receivableTag
    );

    // Map paidAmount to receivedAmount for frontend compatibility
    return {
      ...result,
      receivedAmount: result.paidAmount,
      paidAmount: undefined,
    };
  }

  async remove(id: string, organizationId: string) {
    return this.removeBase(id, organizationId);
  }

  async cancel(id: string, organizationId: string) {
    return this.cancelBase(id, organizationId);
  }

  // Update overdue status - called by cron job
  async updateOverdueStatus(organizationId?: string) {
    return this.updateOverdueStatusBase(organizationId);
  }
}
