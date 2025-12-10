import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ example: 'Fornecedor ABC' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional({ example: 'contato@fornecedor.com' })
  @IsEmail()
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

  @ApiPropertyOptional({ example: 'Fornecedor principal' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ example: 'Fornecedor ABC' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional({ example: 'contato@fornecedor.com' })
  @IsEmail()
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

  @ApiPropertyOptional({ example: 'Fornecedor principal' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
