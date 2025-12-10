import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReceivablesService } from './receivables.service';
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
} from './dto/receivable.dto';
import { CurrentUser, Roles } from '../../shared/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Contas a Receber')
@ApiBearerAuth()
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as contas a receber' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: ReceivableFilterDto
  ) {
    return this.receivablesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter conta a receber por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.receivablesService.findOne(id, organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Criar nova conta a receber' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateReceivableDto
  ) {
    return this.receivablesService.create(organizationId, createDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Atualizar conta a receber' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateReceivableDto
  ) {
    return this.receivablesService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir conta a receber' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.receivablesService.remove(id, organizationId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Cancelar conta a receber' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.receivablesService.cancel(id, organizationId);
  }
}
