import { Module } from '@nestjs/common';
import { PayablesService } from './payables.service';
import { PayablesController } from './payables.controller';
import { CacheModule } from '../../shared/modules/cache.module';

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
  CancelPayableUseCase,
  GetPayablePaymentsUseCase,
  DeletePayableInstallmentUseCase,
  UpdatePayableInstallmentUseCase,
} from './use-cases';

@Module({
  imports: [CacheModule],
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
    CancelPayableUseCase,
    GetPayablePaymentsUseCase,
    DeletePayableInstallmentUseCase,
    UpdatePayableInstallmentUseCase,
  ],
  exports: [PayablesService],
})
export class PayablesModule {}
