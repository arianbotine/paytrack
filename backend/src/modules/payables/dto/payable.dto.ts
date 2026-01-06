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
  ValidateIf,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class CreatePayableDto {
  @ApiProperty({ example: 'uuid-do-credor' })
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional({ example: 'uuid-da-categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 1500 })
  @IsNumber({}, { message: 'Valor deve ser um número válido' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  @Transform(({ value }) =>
    typeof value === 'number' ? Math.round(value * 100) / 100 : value
  )
  amount!: number;

  @ApiProperty({ example: '2025-12-15' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ example: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'NF-12345' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

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

  @ApiPropertyOptional({
    type: [String],
    example: ['2026-01-15', '2026-02-15', '2026-03-15'],
    description:
      'Array de datas de vencimento (YYYY-MM-DD) - obrigatório quando installmentCount > 1',
  })
  @IsArray()
  @IsDateString({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @ValidateIf(o => o.installmentCount && o.installmentCount > 1)
  dueDates?: string[];
}

export class UpdatePayableDto extends PartialType(
  OmitType(CreatePayableDto, [] as const)
) {}

export class PayableFilterDto {
  @ApiPropertyOptional({ example: 'uuid-do-credor' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

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
    enum: AccountStatus,
    example: [AccountStatus.PENDING, AccountStatus.OVERDUE],
  })
  @IsArray()
  @IsEnum(AccountStatus, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s: string) => s.trim());
    }
    return value;
  })
  status?: AccountStatus[];

  @ApiPropertyOptional({ example: '2025-12-01' })
  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

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
