import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class CreateUserDto {
  @ApiProperty({ example: "joao@empresa.com" })
  @IsEmail({}, { message: "Email inválido" })
  email!: string;

  @ApiProperty({ example: "senha123" })
  @IsString()
  @MinLength(6, { message: "Senha deve ter no mínimo 6 caracteres" })
  password!: string;

  @ApiProperty({ example: "João Silva" })
  @IsString()
  name!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ACCOUNTANT })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "joao@empresa.com" })
  @IsEmail({}, { message: "Email inválido" })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "novasenha123" })
  @IsString()
  @MinLength(6, { message: "Senha deve ter no mínimo 6 caracteres" })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: "João Silva" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.ACCOUNTANT })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
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
