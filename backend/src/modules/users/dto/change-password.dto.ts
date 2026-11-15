import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'senhaAtual123' })
  @IsString()
  @MinLength(1, { message: 'Senha atual é obrigatória' })
  currentPassword!: string;

  @ApiProperty({ example: 'x' })
  @IsString()
  @MinLength(1, { message: 'Nova senha é obrigatória' })
  newPassword!: string;
}
