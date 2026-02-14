import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DueAlertsFilterDto {
  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200 })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
