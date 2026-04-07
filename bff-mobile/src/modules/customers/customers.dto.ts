import {
  IsOptional,
  IsString,
  IsEmail,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CustomerQueryDto {
  @ApiPropertyOptional({
    example: 'Cliente XYZ',
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

export class CreateCustomerBffDto {
  @ApiProperty({ example: 'Cliente XYZ' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
