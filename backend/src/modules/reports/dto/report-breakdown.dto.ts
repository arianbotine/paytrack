import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Número de registros a pular (paginação)',
    example: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : 0))
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Número de registros a retornar (paginação)',
    example: 10,
    default: 10,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : 10))
  take?: number = 10;
}
