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
import { PayablesService } from './payables.service';
import {
  CreatePayableDto,
  UpdatePayableDto,
  PayableFilterDto,
  UpdateInstallmentDto,
  CreateInstallmentItemDto,
  UpdateInstallmentItemDto,
} from './dto/payable.dto';
import { CurrentUser, Roles } from '../../shared/decorators';
import { Idempotent } from '../../shared/decorators/idempotent.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Contas a Pagar')
@ApiBearerAuth()
@Controller('payables')
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as contas a pagar' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: PayableFilterDto
  ) {
    return this.payablesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter conta a pagar por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.payablesService.findOne(id, organizationId);
  }

  @Post()
  @Idempotent()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Criar nova conta a pagar' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreatePayableDto
  ) {
    return this.payablesService.create(organizationId, createDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Atualizar conta a pagar' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdatePayableDto
  ) {
    return this.payablesService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir conta a pagar' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.payablesService.remove(id, organizationId);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Obter histórico de pagamentos da conta a pagar' })
  async getPayments(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.payablesService.getPayments(id, organizationId);
  }

  @Delete(':payableId/installments/:installmentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Excluir parcela pendente' })
  async deleteInstallment(
    @Param('payableId') payableId: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.payablesService.deleteInstallment(
      payableId,
      installmentId,
      organizationId
    );
  }

  @Patch(':payableId/installments/:installmentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Editar valor de parcela pendente' })
  async updateInstallment(
    @Param('payableId') payableId: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateInstallmentDto
  ) {
    return this.payablesService.updateInstallment(
      payableId,
      installmentId,
      organizationId,
      updateDto
    );
  }

  @Get(':payableId/installments/:installmentId/items')
  @ApiOperation({ summary: 'Listar itens detalhados de uma parcela' })
  async listInstallmentItems(
    @Param('payableId') payableId: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.payablesService.listInstallmentItems(
      payableId,
      installmentId,
      organizationId
    );
  }

  @Post(':payableId/installments/:installmentId/items')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Criar item detalhado em parcela' })
  async createInstallmentItem(
    @Param('payableId') payableId: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateInstallmentItemDto
  ) {
    return this.payablesService.createInstallmentItem(
      payableId,
      installmentId,
      organizationId,
      dto
    );
  }

  @Patch(':payableId/installments/:installmentId/items/:itemId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Atualizar item detalhado de parcela' })
  async updateInstallmentItem(
    @Param('payableId') payableId: string,
    @Param('installmentId') installmentId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateInstallmentItemDto
  ) {
    return this.payablesService.updateInstallmentItem(
      payableId,
      installmentId,
      itemId,
      organizationId,
      dto
    );
  }

  @Delete(':payableId/installments/:installmentId/items/:itemId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Excluir item detalhado de parcela' })
  async deleteInstallmentItem(
    @Param('payableId') payableId: string,
    @Param('installmentId') installmentId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.payablesService.deleteInstallmentItem(
      payableId,
      installmentId,
      itemId,
      organizationId
    );
  }
}
