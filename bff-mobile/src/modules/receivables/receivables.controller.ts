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
import { ReceivablesService } from './receivables.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';
import { ReceivableFilterDto, QuickReceiveDto } from './receivables.dto';

@ApiTags('Receivables')
@ApiBearerAuth('JWT')
@Controller('receivables')
@UseGuards(JwtGuard)
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  /**
   * List receivables with mobile-optimized response.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar contas a receber',
    description:
      'Retorna lista paginada de contas a receber otimizada para o app mobile. Cada item traz o próximo vencimento pendente e o progresso das parcelas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista retornada com sucesso.',
    schema: {
      example: {
        items: [
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            amount: 5000.0,
            status: 'PARTIAL',
            customerName: 'Cliente XYZ',
            categoryName: 'Serviços',
            nextDueDate: '2026-04-15',
            nextDueAmount: 2500.0,
            installmentsCount: 2,
            receivedInstallments: 0,
          },
        ],
        total: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async findAll(
    @CurrentUser('accessToken') accessToken: string,
    @Query() filters: ReceivableFilterDto
  ) {
    return this.receivablesService.findAll(accessToken, filters);
  }

  /**
   * Get single receivable detail.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Detalhar conta a receber',
    description:
      'Retorna todos os dados de uma conta a receber, incluindo parcelas individuais com valores recebidos, restantes e status.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da conta a receber',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhe retornado com sucesso.',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        amount: 5000.0,
        status: 'PARTIAL',
        createdAt: '2026-02-01T10:00:00.000Z',
        customer: { id: 'c1c2c3c4-...', name: 'Cliente XYZ' },
        category: { id: 'ca1ca2-...', name: 'Serviços' },
        tags: [{ id: 't1t2t3t4-...', name: 'recorrente' }],
        installments: [
          {
            id: 'i1i2i3i4-...',
            installmentNumber: 1,
            dueDate: '2026-03-15',
            amount: 2500.0,
            paidAmount: 2500.0,
            remaining: 0.0,
            status: 'PAID',
            notes: null,
          },
          {
            id: 'i2i3i4i5-...',
            installmentNumber: 2,
            dueDate: '2026-04-15',
            amount: 2500.0,
            paidAmount: 0.0,
            remaining: 2500.0,
            status: 'PENDING',
            notes: null,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada.' })
  async findOne(
    @CurrentUser('accessToken') accessToken: string,
    @Param('id') id: string
  ) {
    return this.receivablesService.findOne(accessToken, id);
  }

  /**
   * Quick receive - register payment for a receivable installment.
   */
  @Post(':receivableId/installments/:installmentId/receive')
  @ApiOperation({
    summary: 'Registrar recebimento rápido',
    description:
      'Registra um recebimento para uma parcela específica de uma conta a receber. Se o valor recebido for inferior ao valor da parcela, o status passa para PARTIAL.',
  })
  @ApiParam({
    name: 'receivableId',
    description: 'UUID da conta a receber',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'installmentId',
    description: 'UUID da parcela a ser baixada',
    example: 'i1i2i3i4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiBody({ type: QuickReceiveDto })
  @ApiResponse({
    status: 201,
    description: 'Recebimento registrado com sucesso.',
    schema: {
      example: {
        id: 'p1p2p3p4-e5f6-7890-abcd-ef1234567890',
        amount: 2500.0,
        paymentDate: '2026-03-18',
        paymentMethod: 'PIX',
        reference: 'PIX-2026031800042',
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
  async quickReceive(
    @CurrentUser('accessToken') accessToken: string,
    @Param('receivableId') receivableId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: QuickReceiveDto
  ) {
    return this.receivablesService.quickReceive(
      accessToken,
      receivableId,
      installmentId,
      dto
    );
  }

  /**
   * Get payment history for a receivable.
   */
  @Get(':id/payments')
  @ApiOperation({
    summary: 'Histórico de recebimentos',
    description:
      'Retorna todos os recebimentos já registrados para uma conta a receber.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da conta a receber',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso.',
    schema: {
      example: [
        {
          id: 'p1p2p3p4-...',
          amount: 2500.0,
          paymentDate: '2026-03-15',
          paymentMethod: 'PIX',
          reference: 'PIX-2026031500010',
          notes: null,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada.' })
  async getPayments(
    @CurrentUser('accessToken') accessToken: string,
    @Param('id') id: string
  ) {
    return this.receivablesService.getPayments(accessToken, id);
  }
}
