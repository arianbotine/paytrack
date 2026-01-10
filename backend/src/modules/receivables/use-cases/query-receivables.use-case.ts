import { Injectable, NotFoundException } from '@nestjs/common';
import { ReceivableFilterDto } from '../dto/receivable.dto';
import { ReceivableInstallmentCalculator } from '../services/receivable-installment-calculator.service';
import { ReceivableQueryFilterBuilder } from '../services/receivable-query-filter-builder.service';
import { ReceivableDataTransformer } from '../services/receivable-data-transformer.service';
import { ReceivableQueryService } from '../services/receivable-query.service';

/**
 * Use Case: Consultar Receivables
 * Responsabilidade: orquestrar a busca e formatação de resultados
 */
@Injectable()
export class QueryReceivablesUseCase {
  constructor(
    private readonly queryService: ReceivableQueryService,
    private readonly filterBuilder: ReceivableQueryFilterBuilder,
    private readonly installmentCalculator: ReceivableInstallmentCalculator,
    private readonly dataTransformer: ReceivableDataTransformer
  ) {}

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
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
    const receivableIds = data.map(r => r.id);
    const nextInstallmentInfo =
      await this.installmentCalculator.findNextUnpaidInstallments(
        receivableIds
      );

    // Transformar dados
    const transformedData = this.dataTransformer.transformReceivablesList(data);
    const enrichedData =
      this.dataTransformer.enrichReceivablesWithCalculatedFields(
        transformedData,
        nextInstallmentInfo
      );

    return { data: enrichedData, total };
  }

  async findOne(id: string, organizationId: string) {
    // Construir opções de include
    const include = this.filterBuilder.buildSingleIncludeOptions();

    // Executar query
    const receivable = await this.queryService.findOne(
      id,
      organizationId,
      include
    );

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Buscar informações da próxima parcela
    const nextInstallmentInfo =
      await this.installmentCalculator.findNextUnpaidInstallment(id);

    // Transformar dados
    const transformed =
      this.dataTransformer.transformReceivableSingle(receivable);
    const enriched = this.dataTransformer.enrichReceivableWithCalculatedFields(
      transformed,
      nextInstallmentInfo
    );

    return enriched;
  }
}
