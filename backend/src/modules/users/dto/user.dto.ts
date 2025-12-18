import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  IsBoolean,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty({ example: 'minhasenha123' })
  @IsString()
  @MinLength(1, { message: 'Senha é obrigatória' })
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
