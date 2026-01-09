import { Module } from '@nestjs/common';
import { ReceivablesService } from './receivables.service';
import { ReceivablesController } from './receivables.controller';
import { CacheModule } from '../../shared/modules/cache.module';

// Repositories
import {
  ReceivablesRepository,
  ReceivableInstallmentsRepository,
} from './repositories';

// Domain Services
import { ReceivableInstallmentsManager } from './domain';
import { InstallmentsCalculator } from '../payables/domain/installments-calculator.service';

// Use Cases
import {
  CreateReceivableUseCase,
  UpdateReceivableUseCase,
  DeleteReceivableUseCase,
  QueryReceivablesUseCase,
  CancelReceivableUseCase,
  GetReceivablePaymentsUseCase,
  DeleteReceivableInstallmentUseCase,
  UpdateReceivableInstallmentUseCase,
} from './use-cases';

@Module({
  imports: [CacheModule],
  controllers: [ReceivablesController],
  providers: [
    // Application Service
    ReceivablesService,

    // Repositories
    ReceivablesRepository,
    ReceivableInstallmentsRepository,

    // Domain Services (compartilhado do Payables)
    InstallmentsCalculator,
    ReceivableInstallmentsManager,

    // Use Cases
    CreateReceivableUseCase,
    UpdateReceivableUseCase,
    DeleteReceivableUseCase,
    QueryReceivablesUseCase,
    CancelReceivableUseCase,
    GetReceivablePaymentsUseCase,
    DeleteReceivableInstallmentUseCase,
    UpdateReceivableInstallmentUseCase,
  ],
  exports: [ReceivablesService],
})
export class ReceivablesModule {}
