import { Controller, Get, Post, Delete, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto, QuickPaymentDto } from "./dto/payment.dto";
import { CurrentUser, Roles } from "../../shared/decorators";
import { UserRole } from "@prisma/client";

@ApiTags("Pagamentos")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: "Listar todos os pagamentos" })
  async findAll(@CurrentUser("organizationId") organizationId: string) {
    return this.paymentsService.findAll(organizationId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obter pagamento por ID" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
  ) {
    return this.paymentsService.findOne(id, organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: "Criar novo pagamento com alocações" })
  async create(
    @CurrentUser("organizationId") organizationId: string,
    @Body() createDto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(organizationId, createDto);
  }

  @Post("quick")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: "Baixa rápida de uma conta" })
  async quickPayment(
    @CurrentUser("organizationId") organizationId: string,
    @Body() dto: QuickPaymentDto,
  ) {
    return this.paymentsService.quickPayment(organizationId, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Excluir pagamento (estorna os valores)" })
  async remove(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
  ) {
    return this.paymentsService.remove(id, organizationId);
  }
}
