import { ApiProperty } from '@nestjs/swagger';

export class TimeSeriesDataDto {
  @ApiProperty({
    description: 'Período (formato ISO para datas)',
    example: '2026-01-01',
  })
  period!: string;

  @ApiProperty({
    description: 'Total pago no período',
    example: 5000,
  })
  payables!: number;

  @ApiProperty({
    description: 'Total recebido no período',
    example: 8000,
  })
  receivables!: number;

  @ApiProperty({
    description: 'Quantidade de transações no período',
    example: 15,
  })
  count!: number;
}

export class ComparisonDto {
  @ApiProperty({
    description: 'Valor do período atual',
    example: 5000,
  })
  current!: number;

  @ApiProperty({
    description: 'Valor do período anterior',
    example: 4500,
  })
  previous!: number;

  @ApiProperty({
    description: 'Variação percentual',
    example: 11.11,
  })
  variance!: number;
}

export class BreakdownItemDto {
  @ApiProperty({
    description: 'ID do item',
    example: 'uuid-1',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome do item',
    example: 'Categoria A',
  })
  name!: string;

  @ApiProperty({
    description: 'Valor total do item',
    example: 2500,
  })
  amount!: number;

  @ApiProperty({
    description: 'Percentual em relação ao total',
    example: 25.5,
  })
  percentage!: number;

  @ApiProperty({
    description: 'Quantidade de transações',
    example: 10,
  })
  count!: number;
}

export class PaginatedBreakdownDto {
  @ApiProperty({
    type: [BreakdownItemDto],
    description: 'Lista de itens',
  })
  data!: BreakdownItemDto[];

  @ApiProperty({
    description: 'Total de registros',
    example: 50,
  })
  total!: number;
}

export class ReportTotalsDto {
  @ApiProperty({
    type: ComparisonDto,
    description: 'Total de pagamentos (a pagar)',
  })
  payables!: ComparisonDto;

  @ApiProperty({
    type: ComparisonDto,
    description: 'Total de recebimentos (a receber)',
  })
  receivables!: ComparisonDto;

  @ApiProperty({
    type: ComparisonDto,
    description: 'Saldo líquido (recebimentos - pagamentos)',
  })
  netBalance!: ComparisonDto;

  @ApiProperty({
    type: ComparisonDto,
    description: 'Total de transações',
  })
  transactions!: ComparisonDto;
}

export class ReportBreakdownDto {
  @ApiProperty({
    type: PaginatedBreakdownDto,
    description: 'Breakdown por categoria',
  })
  byCategory!: PaginatedBreakdownDto;

  @ApiProperty({
    type: PaginatedBreakdownDto,
    description: 'Breakdown por método de pagamento',
  })
  byPaymentMethod!: PaginatedBreakdownDto;
}

export class PaymentsReportResponseDto {
  @ApiProperty({
    type: [TimeSeriesDataDto],
    description: 'Série temporal de dados',
  })
  timeSeries!: TimeSeriesDataDto[];

  @ApiProperty({
    type: ReportTotalsDto,
    description: 'Totais com comparação de períodos',
  })
  totals!: ReportTotalsDto;

  @ApiProperty({
    type: ReportBreakdownDto,
    description: 'Breakdown detalhado',
  })
  breakdown!: ReportBreakdownDto;
}
