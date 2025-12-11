import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@paytrack.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password!: string;
}

export class SelectOrganizationDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID('4', { message: 'Organization ID inválido' })
  @IsNotEmpty({ message: 'Organization ID é obrigatório' })
  organizationId!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  user!: {
    id: string;
    email: string;
    name: string;
    isSystemAdmin: boolean;
    currentOrganization?: {
      id: string;
      name: string;
      role: string;
    };
    availableOrganizations: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId?: string;
  role?: string;
  isSystemAdmin: boolean;
}
