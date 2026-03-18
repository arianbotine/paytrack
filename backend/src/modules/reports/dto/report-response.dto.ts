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

export class ReportTagDto {
  @ApiProperty({ description: 'ID da tag', example: 'uuid-tag-1' })
  id!: string;

  @ApiProperty({ description: 'Nome da tag', example: 'Urgente' })
  name!: string;

  @ApiProperty({
    description: 'Cor da tag em hexadecimal',
    example: '#FF5733',
    nullable: true,
  })
  color!: string | null;
}

export class PaymentsReportDetailItemDto {
  @ApiProperty({ description: 'ID do pagamento', example: 'uuid-1' })
  id!: string;

  @ApiProperty({
    description: 'Data do pagamento (ISO 8601)',
    example: '2026-01-15T10:00:00.000Z',
  })
  paymentDate!: string;

  @ApiProperty({ description: 'Valor total do pagamento', example: 1500 })
  amount!: number;

  @ApiProperty({
    description: 'Método de pagamento',
    example: 'PIX',
  })
  paymentMethod!: string;

  @ApiProperty({
    description:
      'Tipo: pagamento a fornecedor, recebimento de cliente ou misto',
    enum: ['payable', 'receivable', 'mixed'],
    example: 'payable',
  })
  type!: 'payable' | 'receivable' | 'mixed';

  @ApiProperty({
    description: 'Nome do(s) fornecedor(es) pagos',
    example: 'Fornecedor A',
    nullable: true,
  })
  vendorName!: string | null;

  @ApiProperty({
    description: 'Nome do(s) cliente(s) que pagaram',
    example: 'Cliente B',
    nullable: true,
  })
  customerName!: string | null;

  @ApiProperty({
    description: 'Nome da(s) categoria(s) envolvidas',
    example: 'Aluguel',
    nullable: true,
  })
  categoryName!: string | null;

  @ApiProperty({
    description: 'Referência/número do documento',
    example: 'NF-001',
    nullable: true,
  })
  reference!: string | null;

  @ApiProperty({
    description: 'Observações do pagamento',
    example: 'Pagamento referente ao mês de janeiro',
    nullable: true,
  })
  notes!: string | null;

  @ApiProperty({
    type: [ReportTagDto],
    description: 'Tags das contas vinculadas ao pagamento',
  })
  tags!: ReportTagDto[];
}

export class PaymentsReportDetailsResponseDto {
  @ApiProperty({
    type: [PaymentsReportDetailItemDto],
    description: 'Lista de transações do período',
  })
  data!: PaymentsReportDetailItemDto[];

  @ApiProperty({
    description: 'Total de registros para paginação',
    example: 120,
  })
  total!: number;
}
