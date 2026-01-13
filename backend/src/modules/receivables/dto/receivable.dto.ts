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
  ValidateNested,
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
import { PaymentMethod } from '@prisma/client';

/**
 * DTO para pagamento opcional durante a criação de conta
 */
export class CreatePaymentOnAccountDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2],
    description:
      'Números das parcelas a serem recebidas (ex: [1, 2, 3] para receber as 3 primeiras)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione pelo menos uma parcela para receber' })
  @IsInt({ each: true })
  @Min(1, { each: true, message: 'Número de parcela deve ser maior que zero' })
  installmentNumbers!: number[];

  @ApiProperty({
    example: '2026-01-13T14:30:00.000Z',
    description: 'Data e hora do recebimento (ISO datetime, deve ser <= hoje)',
  })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
    description: 'Método de recebimento utilizado',
  })
  @IsEnum(PaymentMethod, { message: 'Método de recebimento inválido' })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    example: 'Comprovante PIX 123456',
    description: 'Referência ou comprovante do recebimento',
  })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    example: 'Recebimento via app',
    description: 'Observações sobre o recebimento',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

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

  // Payment during creation (optional)
  @ApiPropertyOptional({
    type: CreatePaymentOnAccountDto,
    description:
      'Recebimento opcional durante a criação. Permite receber parcelas completas imediatamente.',
  })
  @ValidateNested()
  @Type(() => CreatePaymentOnAccountDto)
  @IsOptional()
  payment?: CreatePaymentOnAccountDto;
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
    example: [ReceivableStatus.PENDING, ReceivableStatus.PARTIAL],
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

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-tag-1', 'uuid-tag-2'],
    description:
      'Tags das parcelas (filtra contas que possuem parcelas com essas tags)',
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
  installmentTagIds?: string[];
}

export class UpdateInstallmentDto {
  @ApiPropertyOptional({ example: 250.5 })
  @IsOptional()
  @IsNumber({}, { message: 'Valor deve ser um número válido' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  @Transform(({ value }) =>
    typeof value === 'number' ? Math.round(value * 100) / 100 : value
  )
  amount?: number;

  @ApiPropertyOptional({ example: '2024-12-25' })
  @IsOptional()
  @IsDateString({}, { message: 'Data de vencimento inválida' })
  dueDate?: string;

  @ApiPropertyOptional({ example: 'Observações sobre a parcela' })
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
}
