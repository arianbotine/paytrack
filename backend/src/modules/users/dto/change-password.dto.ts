import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'senhaAtual123' })
  @IsString()
  @MinLength(1, { message: 'Senha atual é obrigatória' })
  currentPassword!: string;

  @ApiProperty({ example: 'novaSenha456' })
  @IsString()
  @MinLength(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' })
  newPassword!: string;
}
