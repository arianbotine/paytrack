import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreatePayableDto,
  UpdatePayableDto,
  PayableFilterDto,
  UpdateInstallmentDto,
  CreateInstallmentItemDto,
  UpdateInstallmentItemDto,
} from './dto/payable.dto';
import {
  CreatePayableUseCase,
  UpdatePayableUseCase,
  DeletePayableUseCase,
  ListPayablesUseCase,
  GetPayablePaymentsUseCase,
  DeletePayableInstallmentUseCase,
  UpdatePayableInstallmentUseCase,
  ListPayableInstallmentItemsUseCase,
  CreatePayableInstallmentItemUseCase,
  UpdatePayableInstallmentItemUseCase,
  DeletePayableInstallmentItemUseCase,
} from './use-cases';
import { PayablesRepository } from './repositories';

/**
 * Application Service para Payables
 * Responsabilidade: coordenar use cases e operações de alto nível
 *
 * Este service agora é uma camada fina que delega para use cases específicos,
 * mantendo apenas coordenação e operações que não justificam um use case próprio.
 */
@Injectable()
export class PayablesService {
  constructor(
    private readonly createPayableUseCase: CreatePayableUseCase,
    private readonly updatePayableUseCase: UpdatePayableUseCase,
    private readonly deletePayableUseCase: DeletePayableUseCase,
    private readonly listPayablesUseCase: ListPayablesUseCase,
    private readonly getPayablePaymentsUseCase: GetPayablePaymentsUseCase,
    private readonly deletePayableInstallmentUseCase: DeletePayableInstallmentUseCase,
    private readonly updatePayableInstallmentUseCase: UpdatePayableInstallmentUseCase,
    private readonly listPayableInstallmentItemsUseCase: ListPayableInstallmentItemsUseCase,
    private readonly createPayableInstallmentItemUseCase: CreatePayableInstallmentItemUseCase,
    private readonly updatePayableInstallmentItemUseCase: UpdatePayableInstallmentItemUseCase,
    private readonly deletePayableInstallmentItemUseCase: DeletePayableInstallmentItemUseCase,
    private readonly payablesRepository: PayablesRepository
  ) {}

  async findAll(organizationId: string, filters?: PayableFilterDto) {
    return this.listPayablesUseCase.execute(organizationId, filters);
  }

  async findOne(id: string, organizationId: string) {
    const payable = await this.payablesRepository.findFirst(
      { id, organizationId },
      {
        vendor: true,
        category: true,
        tags: { include: { tag: true } },
        installments: {
          include: {
            tags: {
              include: {
                tag: { select: { id: true, name: true, color: true } },
              },
            },
            lineItems: {
              include: {
                tags: {
                  include: {
                    tag: { select: { id: true, name: true, color: true } },
                  },
                },
              },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: { installmentNumber: 'asc' },
        },
      }
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    return payable;
  }

  async create(organizationId: string, createDto: CreatePayableDto) {
    return this.createPayableUseCase.execute(organizationId, createDto);
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdatePayableDto
  ) {
    return this.updatePayableUseCase.execute(id, organizationId, updateDto);
  }

  async remove(id: string, organizationId: string) {
    return this.deletePayableUseCase.execute(id, organizationId);
  }

  async getPayments(payableId: string, organizationId: string) {
    return this.getPayablePaymentsUseCase.execute(payableId, organizationId);
  }

  async deleteInstallment(
    payableId: string,
    installmentId: string,
    organizationId: string
  ) {
    return this.deletePayableInstallmentUseCase.execute(
      payableId,
      installmentId,
      organizationId
    );
  }

  async updateInstallment(
    payableId: string,
    installmentId: string,
    organizationId: string,
    updateDto: UpdateInstallmentDto
  ) {
    return this.updatePayableInstallmentUseCase.execute(
      payableId,
      installmentId,
      organizationId,
      updateDto
    );
  }

  async listInstallmentItems(
    payableId: string,
    installmentId: string,
    organizationId: string
  ) {
    return this.listPayableInstallmentItemsUseCase.execute(
      payableId,
      installmentId,
      organizationId
    );
  }

  async createInstallmentItem(
    payableId: string,
    installmentId: string,
    organizationId: string,
    dto: CreateInstallmentItemDto
  ) {
    return this.createPayableInstallmentItemUseCase.execute(
      payableId,
      installmentId,
      organizationId,
      dto
    );
  }

  async updateInstallmentItem(
    payableId: string,
    installmentId: string,
    itemId: string,
    organizationId: string,
    dto: UpdateInstallmentItemDto
  ) {
    return this.updatePayableInstallmentItemUseCase.execute(
      payableId,
      installmentId,
      itemId,
      organizationId,
      dto
    );
  }

  async deleteInstallmentItem(
    payableId: string,
    installmentId: string,
    itemId: string,
    organizationId: string
  ) {
    return this.deletePayableInstallmentItemUseCase.execute(
      payableId,
      installmentId,
      itemId,
      organizationId
    );
  }
}
