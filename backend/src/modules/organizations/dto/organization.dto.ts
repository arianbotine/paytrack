import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Empresa ABC' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name!: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim() || undefined)
  document?: string;

  @ApiPropertyOptional({ example: 'contato@empresa.com' })
  @ValidateIf(o => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Rua A, 123' })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
