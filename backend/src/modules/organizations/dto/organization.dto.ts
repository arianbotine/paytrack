import { IsString, IsOptional, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Empresa ABC' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim() || undefined)
  document?: string;

  @ApiPropertyOptional({ example: 'contato@empresa.com' })
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
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
