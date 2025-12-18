import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
} from './dto/receivable.dto';
import { BaseAccountService } from '../shared/base-account.service';
import { CacheService } from '../../shared/services/cache.service';

@Injectable()
export class ReceivablesService extends BaseAccountService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly cacheService: CacheService
  ) {
    super(prisma, cacheService);
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

  protected getMoneyFields(): string[] {
    return ['amount', 'receivedAmount'];
  }

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
    return this.findAllBase(organizationId, filters, {
      ...(filters?.customerId && { customerId: filters.customerId }),
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.findOneBase(id, organizationId);
  }

  async create(organizationId: string, createDto: CreateReceivableDto) {
    return this.createBase(organizationId, createDto);
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateReceivableDto
  ) {
    return this.updateBase(
      id,
      organizationId,
      updateDto,
      this.prisma.receivableTag
    );
  }

  async remove(id: string, organizationId: string) {
    return this.removeBase(id, organizationId);
  }

  async cancel(id: string, organizationId: string) {
    return this.cancelBase(id, organizationId);
  }

  async getPayments(id: string, organizationId: string) {
    // Verify the receivable exists and belongs to the organization
    await this.findOne(id, organizationId);

    const allocations = await this.prisma.paymentAllocation.findMany({
      where: {
        receivableId: id,
        payment: { organizationId },
      },
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            notes: true,
          },
        },
      },
      orderBy: {
        payment: { paymentDate: 'desc' },
      },
    });

    // Transform and map for frontend
    return allocations.map(allocation => ({
      id: allocation.id,
      amount: Number(allocation.amount),
      payment: {
        ...allocation.payment,
        amount: Number(allocation.payment.amount),
        method: allocation.payment.paymentMethod,
        paymentMethod: undefined,
      },
    }));
  }

  // Update overdue status - called by cron job
  async updateOverdueStatus(organizationId?: string) {
    return this.updateOverdueStatusBase(organizationId);
  }
}
