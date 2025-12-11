import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { CurrentUser, Roles } from '../../shared/decorators';
import { SystemAdminGuard } from '../../shared/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Organização')
@ApiBearerAuth()
@Controller('organization')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obter dados da organização atual' })
  async findOne(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.findOne(organizationId);
  }

  @Patch()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados da organização' })
  async update(
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateOrganizationDto
  ) {
    return this.organizationsService.update(organizationId, updateDto);
  }
}

// System Admin endpoints
@ApiTags('Admin - Organizações')
@ApiBearerAuth()
@Controller('admin/organizations')
@UseGuards(SystemAdminGuard)
export class AdminOrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar todas as organizações' })
  async findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Obter organização por ID com usuários' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.getOrganizationWithUsers(id);
  }

  @Post()
  @ApiOperation({ summary: '[Admin] Criar nova organização' })
  async create(@Body() createDto: CreateOrganizationDto) {
    return this.organizationsService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Atualizar organização' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto
  ) {
    return this.organizationsService.update(id, updateDto);
  }
}
