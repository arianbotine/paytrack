import { Module } from '@nestjs/common';
import { ReceivablesRepository } from '../repositories/receivables.repository';
import { ReceivableInstallmentCalculator } from './receivable-installment-calculator.service';
import { ReceivableQueryFilterBuilder } from './receivable-query-filter-builder.service';
import { ReceivableDataTransformer } from './receivable-data-transformer.service';
import { ReceivableQueryService } from './receivable-query.service';

/**
 * Módulo de serviços auxiliares para contas a receber
 */
@Module({
  providers: [
    ReceivablesRepository,
    ReceivableInstallmentCalculator,
    ReceivableQueryFilterBuilder,
    ReceivableDataTransformer,
    ReceivableQueryService,
  ],
  exports: [
    ReceivableInstallmentCalculator,
    ReceivableQueryFilterBuilder,
    ReceivableDataTransformer,
    ReceivableQueryService,
  ],
})
export class ReceivablesServicesModule {}
