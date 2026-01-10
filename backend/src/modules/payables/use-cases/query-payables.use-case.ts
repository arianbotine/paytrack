import { Injectable, NotFoundException } from '@nestjs/common';
import { PayableFilterDto } from '../dto/payable.dto';
import { PayableInstallmentCalculator } from '../services/payable-installment-calculator.service';
import { PayableQueryFilterBuilder } from '../services/payable-query-filter-builder.service';
import { PayableDataTransformer } from '../services/payable-data-transformer.service';
import { PayableQueryService } from '../services/payable-query.service';

/**
 * Use Case: Listar contas a pagar com filtros
 * Responsabilidade: orquestrar a busca e formatação de resultados
 */
@Injectable()
export class ListPayablesUseCase {
  constructor(
    private readonly queryService: PayableQueryService,
    private readonly filterBuilder: PayableQueryFilterBuilder,
    private readonly installmentCalculator: PayableInstallmentCalculator,
    private readonly dataTransformer: PayableDataTransformer
  ) {}

  async execute(organizationId: string, filters?: PayableFilterDto) {
    // Construir filtros e opções de query
    const where = this.filterBuilder.buildWhereClause(organizationId, filters);
    const include = this.filterBuilder.buildIncludeOptions();

    // Executar query
    const { data, total } = await this.queryService.findManyPaginated(
      where,
      filters,
      include
    );

    // Buscar informações das próximas parcelas
    const payableIds = data.map(p => p.id);
    const nextInstallmentInfo =
      await this.installmentCalculator.findNextUnpaidInstallments(payableIds);

    // Transformar dados
    const transformedData = this.dataTransformer.transformPayablesList(data);
    const enrichedData =
      this.dataTransformer.enrichPayablesWithCalculatedFields(
        transformedData,
        nextInstallmentInfo
      );

    return { data: enrichedData, total };
  }
}

/**
 * Use Case: Buscar uma conta a pagar por ID
 * Responsabilidade: orquestrar a busca de uma conta específica
 */
@Injectable()
export class GetPayableUseCase {
  constructor(
    private readonly queryService: PayableQueryService,
    private readonly filterBuilder: PayableQueryFilterBuilder,
    private readonly installmentCalculator: PayableInstallmentCalculator,
    private readonly dataTransformer: PayableDataTransformer
  ) {}

  async execute(id: string, organizationId: string) {
    // Construir opções de include
    const include = this.filterBuilder.buildSingleIncludeOptions();

    // Executar query
    const payable = await this.queryService.findOne(
      id,
      organizationId,
      include
    );

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Buscar informações da próxima parcela
    const nextInstallmentInfo =
      await this.installmentCalculator.findNextUnpaidInstallment(id);

    // Transformar dados
    const transformed = this.dataTransformer.transformPayableSingle(payable);
    const enriched = this.dataTransformer.enrichPayableWithCalculatedFields(
      transformed,
      nextInstallmentInfo
    );

    return enriched;
  }
}
