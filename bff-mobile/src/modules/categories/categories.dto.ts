import {
  IsOptional,
  IsEnum,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export enum CategoryType {
  PAYABLE = 'PAYABLE',
  RECEIVABLE = 'RECEIVABLE',
}

export class CategoryQueryDto {
  @ApiPropertyOptional({
    enum: CategoryType,
    example: 'PAYABLE',
    description: 'Tipo da categoria',
  })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}

export class CreateCategoryBffDto {
  @ApiProperty({ example: 'Aluguel' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: CategoryType, example: 'PAYABLE' })
  @IsEnum(CategoryType)
  type!: CategoryType;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;
}
