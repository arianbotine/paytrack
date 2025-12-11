import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  AssociateUserDto,
} from './dto/user.dto';
import { CurrentUser, Roles } from '../../shared/decorators';
import { SystemAdminGuard } from '../../shared/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários da organização' })
  async findAll(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.findAll(organizationId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do usuário logado' })
  async updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(userId, updateDto);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obter usuário por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.usersService.findOne(id, organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário na organização' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateUserDto
  ) {
    return this.usersService.create(organizationId, createDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar usuário' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateUserDto
  ) {
    return this.usersService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover usuário da organização' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('sub') currentUserId: string
  ) {
    return this.usersService.remove(id, organizationId, currentUserId);
  }
}

// System Admin endpoints
@ApiTags('Admin - Usuários')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(SystemAdminGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar todos os usuários do sistema' })
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post()
  @ApiOperation({ summary: '[Admin] Criar usuário sem organização' })
  async createUser(@Body() createDto: CreateUserDto) {
    return this.usersService.createSystemUser(createDto);
  }

  @Post(':userId/organizations/:organizationId')
  @ApiOperation({ summary: '[Admin] Associar usuário a organização' })
  async associateUser(
    @Param('userId') userId: string,
    @Param('organizationId') organizationId: string,
    @Body() dto: AssociateUserDto
  ) {
    return this.usersService.associateUserWithOrganization(
      userId,
      organizationId,
      dto.role
    );
  }

  @Delete(':userId/organizations/:organizationId')
  @ApiOperation({ summary: '[Admin] Desassociar usuário de organização' })
  async dissociateUser(
    @Param('userId') userId: string,
    @Param('organizationId') organizationId: string
  ) {
    return this.usersService.dissociateUserFromOrganization(
      userId,
      organizationId
    );
  }
}
