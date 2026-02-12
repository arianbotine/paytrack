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
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  QuickPaymentDto,
  PaymentFilterDto,
  UpdatePaymentDto,
} from './dto/payment.dto';
import { CurrentUser, Roles } from '../../shared/decorators';
import { Idempotent } from '../../shared/decorators/idempotent.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Pagamentos')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os pagamentos' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filters: PaymentFilterDto
  ) {
    return this.paymentsService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter pagamento por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.paymentsService.findOne(id, organizationId);
  }

  @Post()
  @Idempotent()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Criar novo pagamento com alocações' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreatePaymentDto
  ) {
    return this.paymentsService.create(organizationId, createDto);
  }

  @Post('quick')
  @Idempotent()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Baixa rápida de uma conta' })
  async quickPayment(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: QuickPaymentDto
  ) {
    return this.paymentsService.quickPayment(organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Atualizar data de registro e informações do pagamento',
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdatePaymentDto
  ) {
    return this.paymentsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir pagamento (estorna os valores)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.paymentsService.remove(id, organizationId);
  }
}
