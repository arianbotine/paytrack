import { Module } from '@nestjs/common';
import { PayablesRepository } from '../repositories/payables.repository';
import { PayableInstallmentCalculator } from './payable-installment-calculator.service';
import { PayableQueryFilterBuilder } from './payable-query-filter-builder.service';
import { PayableDataTransformer } from './payable-data-transformer.service';
import { PayableQueryService } from './payable-query.service';

/**
 * Módulo de serviços auxiliares para contas a pagar
 */
@Module({
  providers: [
    PayablesRepository,
    PayableInstallmentCalculator,
    PayableQueryFilterBuilder,
    PayableDataTransformer,
    PayableQueryService,
  ],
  exports: [
    PayableInstallmentCalculator,
    PayableQueryFilterBuilder,
    PayableDataTransformer,
    PayableQueryService,
  ],
})
export class PayablesServicesModule {}
