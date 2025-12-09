import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { CurrentUser, Roles } from "../../shared/decorators";
import { UserRole } from "@prisma/client";

@ApiTags("Usuários")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Listar todos os usuários da organização" })
  async findAll(@CurrentUser("organizationId") organizationId: string) {
    return this.usersService.findAll(organizationId);
  }

  @Get(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Obter usuário por ID" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
  ) {
    return this.usersService.findOne(id, organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Criar novo usuário" })
  async create(
    @CurrentUser("organizationId") organizationId: string,
    @Body() createDto: CreateUserDto,
  ) {
    return this.usersService.create(organizationId, createDto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Atualizar usuário" })
  async update(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, organizationId, updateDto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Excluir usuário" })
  async remove(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
    @CurrentUser("sub") currentUserId: string,
  ) {
    return this.usersService.remove(id, organizationId, currentUserId);
  }
}
