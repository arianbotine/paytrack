import { Injectable } from '@nestjs/common';
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
  UpdateInstallmentDto,
} from './dto/receivable.dto';
import {
  CreateReceivableUseCase,
  UpdateReceivableUseCase,
  DeleteReceivableUseCase,
  QueryReceivablesUseCase,
  GetReceivablePaymentsUseCase,
  DeleteReceivableInstallmentUseCase,
  UpdateReceivableInstallmentUseCase,
} from './use-cases';

/**
 * Application Service para Receivables
 * Responsabilidade: coordenar use cases e operações de alto nível
 *
 * Este service é uma camada fina que delega para use cases específicos,
 * mantendo apenas coordenação e operações que não justificam um use case próprio.
 */
@Injectable()
export class ReceivablesService {
  constructor(
    private readonly createReceivableUseCase: CreateReceivableUseCase,
    private readonly updateReceivableUseCase: UpdateReceivableUseCase,
    private readonly deleteReceivableUseCase: DeleteReceivableUseCase,
    private readonly queryReceivablesUseCase: QueryReceivablesUseCase,
    private readonly getReceivablePaymentsUseCase: GetReceivablePaymentsUseCase,
    private readonly deleteReceivableInstallmentUseCase: DeleteReceivableInstallmentUseCase,
    private readonly updateReceivableInstallmentUseCase: UpdateReceivableInstallmentUseCase
  ) {}

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
    return this.queryReceivablesUseCase.findAll(organizationId, filters);
  }

  async findOne(id: string, organizationId: string) {
    return this.queryReceivablesUseCase.findOne(id, organizationId);
  }

  async create(organizationId: string, createDto: CreateReceivableDto) {
    return this.createReceivableUseCase.execute(organizationId, createDto);
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateReceivableDto
  ) {
    return this.updateReceivableUseCase.execute(id, organizationId, updateDto);
  }

  async remove(id: string, organizationId: string) {
    return this.deleteReceivableUseCase.execute(id, organizationId);
  }

  async getPayments(receivableId: string, organizationId: string) {
    return this.getReceivablePaymentsUseCase.execute(
      receivableId,
      organizationId
    );
  }

  async deleteInstallment(
    receivableId: string,
    installmentId: string,
    organizationId: string
  ) {
    return this.deleteReceivableInstallmentUseCase.execute(
      receivableId,
      installmentId,
      organizationId
    );
  }

  async updateInstallment(
    receivableId: string,
    installmentId: string,
    organizationId: string,
    updateDto: UpdateInstallmentDto
  ) {
    return this.updateReceivableInstallmentUseCase.execute(
      receivableId,
      installmentId,
      organizationId,
      updateDto
    );
  }
}
