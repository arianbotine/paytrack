import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/organization.dto';
import { CurrentUser, Roles } from '../../shared/decorators';
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
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organizationId, updateDto);
  }
}
