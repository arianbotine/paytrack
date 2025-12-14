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
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaymentMethod, AccountStatus } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class CreateReceivableDto {
  @ApiProperty({ example: 'uuid-do-cliente' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ example: 'uuid-da-categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'Venda de produtos' })
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

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'PED-12345' })
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
}

export class UpdateReceivableDto extends PartialType(CreateReceivableDto) {}

export class ReceivableFilterDto {
  @ApiPropertyOptional({ example: 'uuid-do-cliente' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

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
