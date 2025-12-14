import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreatePayableDto,
  UpdatePayableDto,
  PayableFilterDto,
} from './dto/payable.dto';
import { BaseAccountService } from '../shared/base-account.service';

@Injectable()
export class PayablesService extends BaseAccountService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.payable;
  }

  protected getEntityName() {
    return 'conta a pagar';
  }

  protected getIncludeOptions() {
    return {
      vendor: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    };
  }

  async findAll(organizationId: string, filters?: PayableFilterDto) {
    return this.findAllBase(organizationId, filters, {
      ...(filters?.vendorId && { vendorId: filters.vendorId }),
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.findOneBase(id, organizationId);
  }

  async create(organizationId: string, createDto: CreatePayableDto) {
    const result = await this.createBase(organizationId, createDto);

    return {
      ...result,
      invoiceNumber: result.documentNumber,
      documentNumber: undefined,
    };
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdatePayableDto
  ) {
    return this.updateBase(
      id,
      organizationId,
      updateDto,
      this.prisma.payableTag
    );
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
