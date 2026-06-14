import { ApiProperty } from '@nestjs/swagger';

export class AiQueryVisualizationDto {
  @ApiProperty({ example: 'line' })
  type: string;

  @ApiProperty({ example: 'month', required: false, nullable: true })
  x?: string | null;

  @ApiProperty({ example: 'revenue', required: false, nullable: true })
  y?: string | null;
}

export class AiQueryMetadataDto {
  @ApiProperty({ example: 'gemini' })
  provider: string;

  @ApiProperty({ example: 1240 })
  execution_time_ms: number;

  @ApiProperty({ example: 'basic' })
  response_mode: 'basic' | 'advanced';

  @ApiProperty({ example: 'vanna_generated', required: false, nullable: true })
  sql_source?: string | null;

  @ApiProperty({ example: 24 })
  row_count: number;

  @ApiProperty({ example: 3 })
  column_count: number;
}

export class AiQueryDiagnosticsTimingsDto {
  @ApiProperty({ example: 12 })
  context_build_ms: number;

  @ApiProperty({ example: 340 })
  sql_generation_ms: number;

  @ApiProperty({ example: 2 })
  sql_validation_ms: number;

  @ApiProperty({ example: 84 })
  query_execution_ms: number;

  @ApiProperty({ example: 410 })
  insight_generation_ms: number;

  @ApiProperty({ example: 4 })
  visualization_ms: number;

  @ApiProperty({ example: 852 })
  total_ms: number;
}

export class AiQueryDiagnosticsDto {
  @ApiProperty({ example: true })
  sql_generated: boolean;

  @ApiProperty({ example: true })
  sql_validated: boolean;

  @ApiProperty({ example: true })
  query_executed: boolean;

  @ApiProperty({ example: false })
  used_fallback_answer: boolean;

  @ApiProperty({ example: 24 })
  rows_returned: number;

  @ApiProperty({ example: 3 })
  columns_returned: number;

  @ApiProperty({ example: 'line' })
  visualization_type: string;

  @ApiProperty({ type: AiQueryDiagnosticsTimingsDto })
  timings: AiQueryDiagnosticsTimingsDto;
}

export class AiQueryChatResponseDto {
  @ApiProperty({ example: 'O faturamento total foi de R$ 1.250.000.' })
  answer: string;

  @ApiProperty({ example: 'SELECT month, revenue FROM ... LIMIT 100' })
  sql: string;

  @ApiProperty({ type: [String], example: ['month', 'revenue'] })
  columns: string[];

  @ApiProperty({
    type: 'array',
    example: [{ month: 'Jan', revenue: 120000 }],
  })
  rows: Record<string, unknown>[];

  @ApiProperty({ type: AiQueryVisualizationDto })
  visualization: AiQueryVisualizationDto;

  @ApiProperty({ type: AiQueryMetadataDto })
  metadata: AiQueryMetadataDto;

  @ApiProperty({ type: AiQueryDiagnosticsDto })
  diagnostics: AiQueryDiagnosticsDto;
}
