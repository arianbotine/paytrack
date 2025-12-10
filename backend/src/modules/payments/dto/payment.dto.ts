import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class QuickPaymentAllocationDto {
  @ApiPropertyOptional({ example: 'uuid-da-conta-a-pagar' })
  @IsUUID()
  @IsOptional()
  payableId?: string;

  @ApiPropertyOptional({ example: 'uuid-da-conta-a-receber' })
  @IsUUID()
  @IsOptional()
  receivableId?: string;

  @ApiProperty({ example: 1000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  amount!: number;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: '2025-12-08' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Observações do pagamento' })
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [QuickPaymentAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickPaymentAllocationDto)
  allocations!: QuickPaymentAllocationDto[];
}

export class QuickPaymentDto {
  @ApiProperty({ example: 'payable', enum: ['payable', 'receivable'] })
  type!: 'payable' | 'receivable';

  @ApiProperty({ example: 'uuid-da-conta' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: '2025-12-08' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Observações' })
  @IsOptional()
  notes?: string;
}
