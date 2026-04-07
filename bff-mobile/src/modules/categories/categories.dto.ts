import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
