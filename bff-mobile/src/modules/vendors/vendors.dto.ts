import {
  IsOptional,
  IsString,
  IsEmail,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class VendorQueryDto {
  @ApiPropertyOptional({
    example: 'Fornecedor ABC',
    description: 'Busca por nome',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Limite de resultados',
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  take?: number = 30;
}

export class CreateVendorBffDto {
  @ApiProperty({ example: 'Fornecedor ABC' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({ example: 'contato@fornecedor.com' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
