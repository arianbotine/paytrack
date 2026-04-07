import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AccountStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CHECK = 'CHECK',
  ACCOUNT_DEBIT = 'ACCOUNT_DEBIT',
  OTHER = 'OTHER',
}

export class PayableFilterDto {
  @ApiPropertyOptional({
    enum: AccountStatus,
    isArray: true,
    example: ['PENDING', 'PARTIAL'],
    description: 'Filtrar por status. Pode ser informado múltiplas vezes.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AccountStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: AccountStatus[];

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Filtrar por UUID do fornecedor',
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'Filtrar por UUID da categoria',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Data de vencimento inicial (ISO 8601, ex: 2026-03-01)',
  })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-31',
    description: 'Data de vencimento final (ISO 8601, ex: 2026-03-31)',
  })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Número de registros a pular (paginação)',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Número de registros a retornar (máx. 50)',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  take?: number;
}

export class QuickPayDto {
  @ApiProperty({
    example: 1500.0,
    description: 'Valor pago nesta operação (em reais)',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
    description: 'Forma de pagamento utilizada',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: '2026-03-18',
    description:
      'Data do pagamento (ISO 8601). Se omitido, usa a data de hoje.',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    example: 'PIX-2026031800001',
    description: 'Código ou identificador da transação (comprovante, NF, etc.)',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    example: 'Pagamento referente à fatura de março/2026',
    description: 'Observação livre sobre o pagamento',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePayableBffDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID do fornecedor',
  })
  @IsString()
  @IsNotEmpty({ message: 'Fornecedor é obrigatório' })
  vendorId!: string;

  @ApiProperty({
    example: 1500.0,
    description: 'Valor total da conta',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({
    example: '2026-05-10',
    description: 'Data do primeiro vencimento (YYYY-MM-DD)',
  })
  @IsDateString()
  firstDueDate!: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Número de parcelas (1-120)',
    minimum: 1,
    maximum: 120,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  @Type(() => Number)
  installmentCount?: number;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'UUID da categoria',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Observações sobre a conta' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: ['uuid-tag-1', 'uuid-tag-2'],
    description: 'IDs das tags a associar',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
