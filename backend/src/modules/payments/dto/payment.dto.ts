import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class QuickPaymentAllocationDto {
  @ApiPropertyOptional({
    example: 'uuid-da-parcela-a-pagar',
    description: 'ID da parcela de conta a pagar',
  })
  @IsUUID()
  @IsOptional()
  payableInstallmentId?: string;

  @ApiPropertyOptional({
    example: 'uuid-da-parcela-a-receber',
    description: 'ID da parcela de conta a receber',
  })
  @IsUUID()
  @IsOptional()
  receivableInstallmentId?: string;

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

  @ApiProperty({ example: '2025-12-08T14:30:00.000Z' })
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
  @IsString()
  @IsIn(['payable', 'receivable'])
  type!: 'payable' | 'receivable';

  @ApiProperty({
    example: 'uuid-da-parcela',
    description: 'ID da parcela a ser paga/recebida',
  })
  @IsUUID()
  installmentId!: string;

  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: '2025-12-08T14:30:00.000Z' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Observações' })
  @IsOptional()
  notes?: string;
}

export class PaymentFilterDto {
  @ApiPropertyOptional({
    type: [String],
    enum: PaymentMethod,
    example: [PaymentMethod.PIX, PaymentMethod.CREDIT_CARD],
  })
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s: string) => s.trim());
    }
    return value;
  })
  paymentMethod?: PaymentMethod[];

  @ApiPropertyOptional({ example: 'payable', enum: ['payable', 'receivable'] })
  @IsString()
  @IsIn(['payable', 'receivable'])
  @IsOptional()
  type?: 'payable' | 'receivable';

  @ApiPropertyOptional({ example: 'uuid-do-credor' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'uuid-do-devedor' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  paymentDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-01-31' })
  @IsDateString()
  @IsOptional()
  paymentDateTo?: string;

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
