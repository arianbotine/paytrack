import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AccountStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
} from "./dto/receivable.dto";
import { MoneyUtils } from "../../shared/utils/money.utils";
import { parseDateUTC, isValidDate } from "../../shared/utils/date.utils";
import { mapInvoiceToDocument } from "../../shared/utils/account.utils";
import { BaseAccountService } from "../shared/base-account.service";

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
    return this.findAllBase(organizationId, filters, {
      ...(filters?.customerId && { customerId: filters.customerId }),
    });
  }

  async create(organizationId: string, createDto: CreateReceivableDto) {
    // Validation
    if (createDto.amount <= 0) {
      throw new BadRequestException("O valor deve ser maior que zero");
    }
    if (!isValidDate(createDto.dueDate)) {
      throw new BadRequestException("Data de vencimento inválida");
    }

    return this.createBase(organizationId, createDto);
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateReceivableDto,
  ) {
    // Validation
    if (updateDto.amount !== undefined && updateDto.amount <= 0) {
      throw new BadRequestException("O valor deve ser maior que zero");
    }
    if (updateDto.dueDate !== undefined && !isValidDate(updateDto.dueDate)) {
      throw new BadRequestException("Data de vencimento inválida");
    }

    return this.updateBase(id, organizationId, updateDto, this.prisma.receivableTag);
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
