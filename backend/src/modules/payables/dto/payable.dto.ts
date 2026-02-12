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
  Matches,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsDateArrayAscendingConstraint } from '../../../shared/validators';
import { PayableStatus } from '../domain/payable-status.enum';
import { PaymentMethod } from '@prisma/client';

/**
 * DTO para pagamento opcional durante a criação de conta
 */
export class CreatePaymentOnAccountDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2],
    description:
      'Números das parcelas a serem pagas (ex: [1, 2, 3] para pagar as 3 primeiras)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione pelo menos uma parcela para pagar' })
  @IsInt({ each: true })
  @Min(1, { each: true, message: 'Número de parcela deve ser maior que zero' })
  installmentNumbers!: number[];

  @ApiProperty({
    example: '2026-01-13T14:30:00.000Z',
    description: 'Data e hora do pagamento (ISO datetime, deve ser <= hoje)',
  })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
    description: 'Método de pagamento utilizado',
  })
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido' })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    example: 'Comprovante PIX 123456',
    description: 'Referência ou comprovante do pagamento',
  })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    example: 'Pagamento realizado via app',
    description: 'Observações sobre o pagamento',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePayableDto {
  @ApiProperty({ example: 'uuid-do-credor' })
  @IsUUID()
  vendorId!: string;

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
      'Pagamento opcional durante a criação. Permite pagar parcelas completas imediatamente.',
  })
  @ValidateNested()
  @Type(() => CreatePaymentOnAccountDto)
  @IsOptional()
  payment?: CreatePaymentOnAccountDto;
}

export class UpdatePayableDto extends PartialType(
  OmitType(CreatePayableDto, ['installmentCount', 'dueDates'] as const)
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
    enum: PayableStatus,
    example: [PayableStatus.PENDING, PayableStatus.PARTIAL],
  })
  @IsArray()
  @IsEnum(PayableStatus, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s: string) => s.trim());
    }
    return value;
  })
  status?: PayableStatus[];

  @ApiPropertyOptional({ example: '2025-12-01' })
  @IsDateString()
  @IsOptional()
  installmentDueDateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  installmentDueDateTo?: string;

  @ApiPropertyOptional({
    example: '2026-02',
    description: 'Mês do próximo vencimento (YYYY-MM)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato inválido. Use YYYY-MM' })
  @IsOptional()
  nextDueMonth?: string;

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
