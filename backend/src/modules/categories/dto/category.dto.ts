import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Aluguel' })
  @IsString()
  name: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.PAYABLE })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({ example: '#EF4444' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'Despesas com aluguel' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Aluguel' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '#EF4444' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'Despesas com aluguel' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
