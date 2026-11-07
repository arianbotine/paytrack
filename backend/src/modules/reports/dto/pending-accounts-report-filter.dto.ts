import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum PendingAccountType {
  ALL = 'ALL',
  PAYABLE = 'PAYABLE',
  RECEIVABLE = 'RECEIVABLE',
}

export enum PendingAccountsDueStatus {
  UPCOMING = 'UPCOMING',
  OVERDUE = 'OVERDUE',
}

export class PendingAccountsReportFilterDto {
  @ApiPropertyOptional({
    enum: PendingAccountType,
    default: PendingAccountType.ALL,
  })
  @IsEnum(PendingAccountType)
  @IsOptional()
  type: PendingAccountType = PendingAccountType.ALL;

  @ApiPropertyOptional({
    enum: PendingAccountsDueStatus,
    default: PendingAccountsDueStatus.UPCOMING,
  })
  @IsEnum(PendingAccountsDueStatus)
  @IsOptional()
  dueStatus: PendingAccountsDueStatus = PendingAccountsDueStatus.UPCOMING;

  @ApiPropertyOptional({
    description: 'Data inicial do vencimento (YYYY-MM-DD)',
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final do vencimento (YYYY-MM-DD)' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Número de registros a pular',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined ? Number.parseInt(value, 10) : 0
  )
  skip = 0;

  @ApiPropertyOptional({
    description: 'Número de registros por página',
    default: 25,
    maximum: 200,
  })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined ? Number.parseInt(value, 10) : 25
  )
  take = 25;
}
