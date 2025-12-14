import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AccountStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import {
  CreatePayableDto,
  UpdatePayableDto,
  PayableFilterDto,
} from "./dto/payable.dto";
import { MoneyUtils } from "../../shared/utils/money.utils";
import { parseDateUTC, isValidDate } from "../../shared/utils/date.utils";
import { mapInvoiceToDocument } from "../../shared/utils/account.utils";
import { BaseAccountService } from "../shared/base-account.service";

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
    const payable = await this.prisma.payable.findFirst({
      where: { id, organizationId },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        allocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!payable) {
      throw new NotFoundException("Conta a pagar não encontrada");
    }

    // Transform Decimal fields to numbers for JSON serialization
    const transformed = MoneyUtils.transformMoneyFields(payable, ["amount", "paidAmount"]);

    // Map documentNumber to invoiceNumber for frontend compatibility
    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async create(organizationId: string, createDto: CreatePayableDto) {
    // Validation
    if (createDto.amount <= 0) {
      throw new BadRequestException("O valor deve ser maior que zero");
    }
    if (!isValidDate(createDto.dueDate)) {
      throw new BadRequestException("Data de vencimento inválida");
    }

    const result = await this.createBase(organizationId, createDto);

    // Map documentNumber to invoiceNumber for frontend compatibility
    return {
      ...result,
      invoiceNumber: result.documentNumber,
      documentNumber: undefined,
    };
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdatePayableDto,
  ) {
    // Validation
    if (updateDto.amount !== undefined && updateDto.amount <= 0) {
      throw new BadRequestException("O valor deve ser maior que zero");
    }
    if (updateDto.dueDate !== undefined && !isValidDate(updateDto.dueDate)) {
      throw new BadRequestException("Data de vencimento inválida");
    }

    const result = await this.updateBase(id, organizationId, updateDto, this.prisma.payableTag);

    // Map documentNumber to invoiceNumber for frontend compatibility
    return {
      ...result,
      invoiceNumber: result.documentNumber,
      documentNumber: undefined,
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
