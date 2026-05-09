import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsUUID,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

function parseCommaSeparated(value: unknown): string[] | unknown {
  if (typeof value === 'string') {
    return value.split(',').filter((id: string) => id.trim());
  }
  return value;
}

export class InstallmentItemsReportFilterDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'IDs das tags para filtrar os itens',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  @Transform(({ value }) => parseCommaSeparated(value))
  tagIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs das categorias para filtrar os itens',
    example: ['uuid-cat-1'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  @IsOptional()
  @Transform(({ value }) => parseCommaSeparated(value))
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Número de registros a pular (paginação)',
    example: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined ? Number.parseInt(value, 10) : 0
  )
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Número de registros a retornar (paginação)',
    example: 50,
    default: 50,
    maximum: 200,
  })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined ? Number.parseInt(value, 10) : 50
  )
  take?: number = 50;

  hasAnyFilter(): boolean {
    return (
      (this.tagIds !== undefined && this.tagIds.length > 0) ||
      (this.categoryIds !== undefined && this.categoryIds.length > 0)
    );
  }
}
