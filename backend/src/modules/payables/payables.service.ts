import { Injectable } from '@nestjs/common';
import {
  CreatePayableDto,
  UpdatePayableDto,
  PayableFilterDto,
  UpdateInstallmentDto,
} from './dto/payable.dto';
import {
  CreatePayableUseCase,
  UpdatePayableUseCase,
  DeletePayableUseCase,
  ListPayablesUseCase,
  GetPayableUseCase,
  UpdateOverdueStatusUseCase,
  CancelPayableUseCase,
  GetPayablePaymentsUseCase,
  DeletePayableInstallmentUseCase,
  UpdatePayableInstallmentUseCase,
} from './use-cases';

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
    private readonly getPayableUseCase: GetPayableUseCase,
    private readonly updateOverdueStatusUseCase: UpdateOverdueStatusUseCase,
    private readonly cancelPayableUseCase: CancelPayableUseCase,
    private readonly getPayablePaymentsUseCase: GetPayablePaymentsUseCase,
    private readonly deletePayableInstallmentUseCase: DeletePayableInstallmentUseCase,
    private readonly updatePayableInstallmentUseCase: UpdatePayableInstallmentUseCase
  ) {}

  async findAll(organizationId: string, filters?: PayableFilterDto) {
    return this.listPayablesUseCase.execute(organizationId, filters);
  }

  async findOne(id: string, organizationId: string) {
    return this.getPayableUseCase.execute(id, organizationId);
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

  async updateOverdueStatus() {
    return this.updateOverdueStatusUseCase.execute();
  }

  async cancel(id: string, organizationId: string) {
    return this.cancelPayableUseCase.execute(id, organizationId);
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
}
