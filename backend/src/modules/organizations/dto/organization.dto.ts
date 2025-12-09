import { IsString, IsOptional, IsEmail } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOrganizationDto {
  @ApiProperty({ example: "Empresa ABC" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "12345678000199" })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional({ example: "contato@empresa.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "(11) 99999-9999" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "Rua A, 123" })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: "Empresa ABC" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "12345678000199" })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional({ example: "contato@empresa.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "(11) 99999-9999" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "Rua A, 123" })
  @IsString()
  @IsOptional()
  address?: string;
}
