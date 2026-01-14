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
  UpdateInstallmentDto,
} from './dto/receivable.dto';
import { CurrentUser, Roles } from '../../shared/decorators';
import { Idempotent } from '../../shared/decorators/idempotent.decorator';
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
  @Idempotent()
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

  @Get(':id/payments')
  @ApiOperation({ summary: 'Obter histórico de pagamentos da conta a receber' })
  async getPayments(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.receivablesService.getPayments(id, organizationId);
  }

  @Delete(':receivableId/installments/:installmentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Excluir parcela pendente' })
  async deleteInstallment(
    @Param('receivableId') receivableId: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.receivablesService.deleteInstallment(
      receivableId,
      installmentId,
      organizationId
    );
  }

  @Patch(':receivableId/installments/:installmentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Editar valor de parcela pendente' })
  async updateInstallment(
    @Param('receivableId') receivableId: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateInstallmentDto
  ) {
    return this.receivablesService.updateInstallment(
      receivableId,
      installmentId,
      organizationId,
      updateDto
    );
  }
}
