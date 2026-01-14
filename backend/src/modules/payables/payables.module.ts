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
  ],
  exports: [PayablesService],
})
export class PayablesModule {}
