import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class InstallmentItemsReportFilterDto {
  @ApiProperty({
    type: [String],
    description: 'IDs das tags para filtrar os itens (obrigatório, mín. 1)',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((id: string) => id.trim());
    }
    return value;
  })
  tagIds: string[];

  @ApiPropertyOptional({
    description: 'Número de registros a pular (paginação)',
    example: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined ? Number.parseInt(value, 10) : 0
  )
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Número de registros a retornar (paginação)',
    example: 50,
    default: 50,
    maximum: 200,
  })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined ? Number.parseInt(value, 10) : 50
  )
  take?: number = 50;
}
