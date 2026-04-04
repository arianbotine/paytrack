import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@paytrack.com',
    description: 'E-mail do usuário cadastrado',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    example: 'admin123',
    description: 'Senha do usuário',
  })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token obtido no login ou refresh anterior',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refreshToken: string;
}

export class SelectOrganizationDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID da organização a ser selecionada',
  })
  @IsUUID('4', { message: 'ID da organização inválido' })
  @IsNotEmpty({ message: 'ID da organização é obrigatório' })
  organizationId: string;
}
