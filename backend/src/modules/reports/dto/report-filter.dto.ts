import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsArray,
  IsString,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsMaxPeriod } from '../../../shared/validators/is-max-period.validator';
import { PaginationDto } from './report-breakdown.dto';

export enum ReportGroupByEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class PaymentsReportFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Data de início (formato ISO 8601)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data de fim (formato ISO 8601)',
    example: '2026-01-31',
  })
  @IsDateString()
  @IsOptional()
  @IsMaxPeriod({ message: 'Período máximo permitido é de 1 ano' })
  endDate?: string;

  @ApiPropertyOptional({
    enum: ReportGroupByEnum,
    description: 'Agrupamento dos dados',
    example: ReportGroupByEnum.MONTH,
    default: ReportGroupByEnum.MONTH,
  })
  @IsEnum(ReportGroupByEnum)
  @IsOptional()
  groupBy?: ReportGroupByEnum = ReportGroupByEnum.MONTH;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs das categorias para filtrar',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter(id => id.trim());
    }
    return value;
  })
  categoryIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs das tags para filtrar',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter(id => id.trim());
    }
    return value;
  })
  tagIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs dos fornecedores para filtrar',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter(id => id.trim());
    }
    return value;
  })
  vendorIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs dos clientes/devedores para filtrar',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter(id => id.trim());
    }
    return value;
  })
  customerIds?: string[];
}
