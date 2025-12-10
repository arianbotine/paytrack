import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, AccountStatus } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class CreatePayableDto {
  @ApiProperty({ example: 'uuid-do-credor' })
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional({ example: 'uuid-da-categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'Aluguel do escritório' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: '2025-12-15' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'NF-12345' })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-tag-1', 'uuid-tag-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];
}

export class UpdatePayableDto {
  @ApiPropertyOptional({ example: 'uuid-do-credor' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'uuid-da-categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Aluguel do escritório' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: '2025-12-15' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'NF-12345' })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-tag-1', 'uuid-tag-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];
}

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
