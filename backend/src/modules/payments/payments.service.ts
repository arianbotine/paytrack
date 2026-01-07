import { Injectable } from '@nestjs/common';
import { CreatePaymentDto, QuickPaymentDto } from './dto/payment.dto';
import {
  CreatePaymentUseCase,
  QuickPaymentUseCase,
  DeletePaymentUseCase,
  ListPaymentsUseCase,
  GetPaymentUseCase,
} from './use-cases';

/**
 * Application Service para Payments
 * Responsabilidade: coordenar use cases
 *
 * Este service é uma camada fina que delega toda a lógica para use cases específicos,
 * mantendo a interface pública consistente para os controllers.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly quickPaymentUseCase: QuickPaymentUseCase,
    private readonly deletePaymentUseCase: DeletePaymentUseCase,
    private readonly listPaymentsUseCase: ListPaymentsUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase
  ) {}

  async findAll(organizationId: string) {
    return this.listPaymentsUseCase.execute(organizationId);
  }

  async findOne(id: string, organizationId: string) {
    return this.getPaymentUseCase.execute(id, organizationId);
  }

  async create(organizationId: string, createDto: CreatePaymentDto) {
    return this.createPaymentUseCase.execute(organizationId, createDto);
  }

  async quickPayment(organizationId: string, dto: QuickPaymentDto) {
    return this.quickPaymentUseCase.execute(organizationId, dto);
  }

  async remove(id: string, organizationId: string) {
    return this.deletePaymentUseCase.execute(id, organizationId);
  }
}
