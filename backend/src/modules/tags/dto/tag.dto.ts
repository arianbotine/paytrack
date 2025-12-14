import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'Urgente' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '#EF4444' })
  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}
