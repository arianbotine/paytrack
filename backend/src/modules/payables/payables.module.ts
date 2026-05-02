import { Module } from '@nestjs/common';
import { PayablesService } from './payables.service';
import { PayablesController } from './payables.controller';
import { CacheModule } from '../../shared/modules/cache.module';
import { PayablesServicesModule } from './services/payables-services.module';
import { PaymentsModule } from '../payments/payments.module';

// Repositories
import {
  PayablesRepository,
  PayableInstallmentsRepository,
  PayableInstallmentItemsRepository,
} from './repositories';

// Domain Services
import { InstallmentsCalculator, PayableInstallmentsManager } from './domain';

// Use Cases
import {
  CreatePayableUseCase,
  UpdatePayableUseCase,
  DeletePayableUseCase,
  ListPayablesUseCase,
  GetPayableUseCase,
  GetPayablePaymentsUseCase,
  DeletePayableInstallmentUseCase,
  UpdatePayableInstallmentUseCase,
  ListPayableInstallmentItemsUseCase,
  CreatePayableInstallmentItemUseCase,
  UpdatePayableInstallmentItemUseCase,
  DeletePayableInstallmentItemUseCase,
} from './use-cases';

@Module({
  imports: [CacheModule, PayablesServicesModule, PaymentsModule],
  controllers: [PayablesController],
  providers: [
    // Application Service
    PayablesService,

    // Repositories
    PayablesRepository,
    PayableInstallmentsRepository,
    PayableInstallmentItemsRepository,

    // Domain Services
    InstallmentsCalculator,
    PayableInstallmentsManager,

    // Use Cases
    CreatePayableUseCase,
    UpdatePayableUseCase,
    DeletePayableUseCase,
    ListPayablesUseCase,
    GetPayableUseCase,
    GetPayablePaymentsUseCase,
    DeletePayableInstallmentUseCase,
    UpdatePayableInstallmentUseCase,
    ListPayableInstallmentItemsUseCase,
    CreatePayableInstallmentItemUseCase,
    UpdatePayableInstallmentItemUseCase,
    DeletePayableInstallmentItemUseCase,
  ],
  exports: [PayablesService],
})
export class PayablesModule {}
