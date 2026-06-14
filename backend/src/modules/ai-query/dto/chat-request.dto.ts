import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiQueryChatRequestDto {
  @ApiProperty({
    description: 'Pergunta em linguagem natural',
    example: 'Qual foi o faturamento dos ultimos 6 meses?',
    maxLength: 4000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @ApiProperty({
    description: 'Modo de resposta do assistente',
    example: 'basic',
    required: false,
    enum: ['basic', 'advanced'],
    default: 'basic',
  })
  @IsOptional()
  @IsString()
  @IsIn(['basic', 'advanced'])
  responseMode?: 'basic' | 'advanced';
}
