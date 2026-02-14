import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  ValidateIf,
  IsInt,
  Min,
  Max,
  IsBoolean,
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

  @ApiPropertyOptional({
    example: 7,
    minimum: 1,
    maximum: 60,
    description: 'Dias de antecedência para alertas de vencimento',
  })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  notificationLeadDays?: number;

  @ApiPropertyOptional({
    example: 60,
    minimum: 15,
    maximum: 300,
    description: 'Intervalo de polling das notificações (segundos)',
  })
  @IsInt()
  @Min(15)
  @Max(300)
  @IsOptional()
  notificationPollingSeconds?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Se deve incluir contas vencidas nas notificações',
  })
  @IsBoolean()
  @IsOptional()
  showOverdueNotifications?: boolean;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
