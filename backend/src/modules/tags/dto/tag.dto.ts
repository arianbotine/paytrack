import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTagDto {
  @ApiProperty({ example: 'Urgente' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value
  )
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '#EF4444' })
  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}
