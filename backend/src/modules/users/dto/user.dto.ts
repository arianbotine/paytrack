import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  IsBoolean,
  Matches,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

// Strong password regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PASSWORD_ERROR_MESSAGE =
  'Senha deve ter no mínimo 8 caracteres, incluindo: letra maiúscula, letra minúscula, número e caractere especial (@$!%*?&)';

export class CreateUserDto {
  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_ERROR_MESSAGE })
  password!: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ACCOUNTANT })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProfileDto extends OmitType(PartialType(CreateUserDto), [
  'role',
] as const) {}

export class AssociateUserDto {
  @ApiProperty({ enum: UserRole, example: UserRole.ACCOUNTANT })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
