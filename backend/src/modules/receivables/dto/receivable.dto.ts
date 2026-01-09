import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  Min,
  Max,
  IsInt,
  Validate,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsDateArrayAscendingConstraint } from '../../../shared/validators';
import { ReceivableStatus } from '../domain/receivable-status.enum';

export class CreateReceivableDto {
  @ApiProperty({ example: 'uuid-do-devedor' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ example: 'uuid-da-categoria', nullable: true })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @ApiProperty({ example: 1500 })
  @IsNumber({}, { message: 'Valor deve ser um número válido' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  @Transform(({ value }) =>
    typeof value === 'number' ? Math.round(value * 100) / 100 : value
  )
  amount!: number;

  @ApiPropertyOptional({ example: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-tag-1', 'uuid-tag-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  // Installment fields
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    maximum: 120,
    default: 1,
    description:
      'Quantidade de parcelas (1 = pagamento único, 2-120 = parcelado)',
  })
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  @Type(() => Number)
  installmentCount?: number = 1;

  @ApiProperty({
    type: [String],
    example: ['2026-01-15', '2026-02-15', '2026-03-15'],
    description:
      'Array de datas de vencimento (YYYY-MM-DD). Para conta única, enviar array com 1 data.',
  })
  @IsArray()
  @IsDateString({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @Validate(IsDateArrayAscendingConstraint)
  dueDates!: string[];
}

export class UpdateReceivableDto extends PartialType(
  OmitType(CreateReceivableDto, ['installmentCount', 'dueDates'] as const)
) {}

export class ReceivableFilterDto {
  @ApiPropertyOptional({ example: 'uuid-do-devedor' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-da-categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-tag-1', 'uuid-tag-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s: string) => s.trim());
    }
    return value;
  })
  tagIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    enum: ReceivableStatus,
    example: [ReceivableStatus.PENDING, ReceivableStatus.OVERDUE],
  })
  @IsArray()
  @IsEnum(ReceivableStatus, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s: string) => s.trim());
    }
    return value;
  })
  status?: ReceivableStatus[];

  @ApiPropertyOptional({ example: '2025-12-01' })
  @IsDateString()
  @IsOptional()
  installmentDueDateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  installmentDueDateTo?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  skip?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  take?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true') return true;
    if (lowerValue === 'false') return false;
    return undefined;
  })
  hideCompleted?: string;
}

export class UpdateInstallmentDto {
  @ApiProperty({ example: 250.5 })
  @IsNumber({}, { message: 'Valor deve ser um número válido' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  @Transform(({ value }) =>
    typeof value === 'number' ? Math.round(value * 100) / 100 : value
  )
  amount!: number;
}
