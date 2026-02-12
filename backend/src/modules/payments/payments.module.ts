import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CacheModule } from '../../shared/modules/cache.module';

// Repositories
import { PaymentsRepository } from './repositories';

// Domain Services
import {
  InstallmentBalanceManager,
  PaymentAllocationsValidator,
} from './domain';

// Use Cases
import {
  CreatePaymentUseCase,
  QuickPaymentUseCase,
  DeletePaymentUseCase,
  UpdatePaymentUseCase,
  ListPaymentsUseCase,
  GetPaymentUseCase,
} from './use-cases';

@Module({
  imports: [CacheModule],
  controllers: [PaymentsController],
  providers: [
    // Application Service
    PaymentsService,

    // Repositories
    PaymentsRepository,

    // Domain Services
    InstallmentBalanceManager,
    PaymentAllocationsValidator,

    // Use Cases
    CreatePaymentUseCase,
    QuickPaymentUseCase,
    DeletePaymentUseCase,
    UpdatePaymentUseCase,
    ListPaymentsUseCase,
    GetPaymentUseCase,
  ],
  exports: [
    PaymentsService,
    CreatePaymentUseCase,
    PaymentsRepository,
    InstallmentBalanceManager,
    PaymentAllocationsValidator,
  ],
})
export class PaymentsModule {}
