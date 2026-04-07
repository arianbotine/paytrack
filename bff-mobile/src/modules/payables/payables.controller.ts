import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PayablesService } from './payables.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';
import {
  PayableFilterDto,
  QuickPayDto,
  CreatePayableBffDto,
} from './payables.dto';

@ApiTags('Payables')
@ApiBearerAuth('JWT')
@Controller('payables')
@UseGuards(JwtGuard)
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  /**
   * Create a new payable.
   */
  @Post()
  @ApiOperation({ summary: 'Criar conta a pagar' })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async create(
    @CurrentUser('accessToken') accessToken: string,
    @Body() dto: CreatePayableBffDto
  ) {
    return this.payablesService.create(accessToken, dto);
  }

  /**
   * List payables with mobile-optimized response.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar contas a pagar',
    description:
      'Retorna lista paginada de contas a pagar otimizada para o app mobile. Cada item traz o próximo vencimento pendente e o progresso das parcelas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista retornada com sucesso.',
    schema: {
      example: {
        items: [
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            amount: 3000.0,
            status: 'PARTIAL',
            vendorName: 'Fornecedor ABC',
            categoryName: 'Aluguel',
            nextDueDate: '2026-04-01',
            nextDueAmount: 1000.0,
            installmentsCount: 3,
            paidInstallments: 1,
          },
        ],
        total: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async findAll(
    @CurrentUser('accessToken') accessToken: string,
    @Query() filters: PayableFilterDto
  ) {
    return this.payablesService.findAll(accessToken, filters);
  }

  /**
   * Get single payable detail.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Detalhar conta a pagar',
    description:
      'Retorna todos os dados de uma conta a pagar, incluindo parcelas individuais com valores pagos, restantes e status.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da conta a pagar',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhe retornado com sucesso.',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        amount: 3000.0,
        status: 'PARTIAL',
        createdAt: '2026-01-10T12:00:00.000Z',
        vendor: { id: 'v1v2v3v4-...', name: 'Fornecedor ABC' },
        category: { id: 'c1c2c3c4-...', name: 'Aluguel' },
        tags: [{ id: 't1t2t3t4-...', name: 'fixo' }],
        installments: [
          {
            id: 'i1i2i3i4-...',
            installmentNumber: 1,
            dueDate: '2026-02-01',
            amount: 1000.0,
            paidAmount: 1000.0,
            remaining: 0.0,
            status: 'PAID',
            notes: null,
          },
          {
            id: 'i2i3i4i5-...',
            installmentNumber: 2,
            dueDate: '2026-03-01',
            amount: 1000.0,
            paidAmount: 0.0,
            remaining: 1000.0,
            status: 'PENDING',
            notes: null,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada.' })
  async findOne(
    @CurrentUser('accessToken') accessToken: string,
    @Param('id') id: string
  ) {
    return this.payablesService.findOne(accessToken, id);
  }

  /**
   * Quick pay - register payment for a payable installment.
   */
  @Post(':payableId/installments/:installmentId/pay')
  @ApiOperation({
    summary: 'Registrar pagamento rápido',
    description:
      'Registra um pagamento para uma parcela específica de uma conta a pagar. Se o valor pago for inferior ao valor da parcela, o status passa para PARTIAL.',
  })
  @ApiParam({
    name: 'payableId',
    description: 'UUID da conta a pagar',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'installmentId',
    description: 'UUID da parcela a ser paga',
    example: 'i1i2i3i4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiBody({ type: QuickPayDto })
  @ApiResponse({
    status: 201,
    description: 'Pagamento registrado com sucesso.',
    schema: {
      example: {
        id: 'p1p2p3p4-e5f6-7890-abcd-ef1234567890',
        amount: 1000.0,
        paymentDate: '2026-03-18',
        paymentMethod: 'PIX',
        reference: 'PIX-2026031800001',
        notes: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos no corpo da requisição.',
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  @ApiResponse({ status: 404, description: 'Parcela não encontrada.' })
  async quickPay(
    @CurrentUser('accessToken') accessToken: string,
    @Param('payableId') payableId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: QuickPayDto
  ) {
    return this.payablesService.quickPay(
      accessToken,
      payableId,
      installmentId,
      dto
    );
  }

  /**
   * Get payment history for a payable.
   */
  @Get(':id/payments')
  @ApiOperation({
    summary: 'Histórico de pagamentos',
    description:
      'Retorna todos os pagamentos já registrados para uma conta a pagar.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da conta a pagar',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso.',
    schema: {
      example: [
        {
          id: 'p1p2p3p4-...',
          amount: 1000.0,
          paymentDate: '2026-02-01',
          paymentMethod: 'PIX',
          reference: 'PIX-2026020100001',
          notes: null,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada.' })
  async getPayments(
    @CurrentUser('accessToken') accessToken: string,
    @Param('id') id: string
  ) {
    return this.payablesService.getPayments(accessToken, id);
  }
}
