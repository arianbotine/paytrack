import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get aggregated dashboard data optimized for mobile.
   * Single endpoint that returns everything the mobile home screen needs.
   */
  @Get()
  @ApiOperation({
    summary: 'Dados da tela inicial',
    description:
      'Endpoint único que retorna todos os dados necessários para a tela home do app mobile: saldo líquido, resumo de contas a pagar e a receber com os próximos vencimentos e itens em atraso. Limitado a 5 itens por lista para performance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard retornado com sucesso.',
    schema: {
      example: {
        balance: {
          toReceive: 12500.0,
          toPay: 4300.0,
          net: 8200.0,
        },
        payables: {
          pendingCount: 3,
          partialCount: 1,
          totalToPay: 4300.0,
          overdueItems: [
            {
              id: 'a1b2c3d4-...',
              installmentId: 'i1i2i3i4-...',
              dueDate: '2026-03-10',
              amount: 1200.0,
              paidAmount: 0.0,
              remaining: 1200.0,
              vendorName: 'Fornecedor ABC',
              categoryName: 'Aluguel',
            },
          ],
          upcomingItems: [
            {
              id: 'a2b3c4d5-...',
              installmentId: 'i2i3i4i5-...',
              dueDate: '2026-03-25',
              amount: 800.0,
              paidAmount: 0.0,
              remaining: 800.0,
              vendorName: 'Energia Elétrica',
              categoryName: 'Utilidades',
            },
          ],
        },
        receivables: {
          pendingCount: 5,
          partialCount: 0,
          totalToReceive: 12500.0,
          overdueItems: [],
          upcomingItems: [
            {
              id: 'b1c2d3e4-...',
              installmentId: 'j1j2j3j4-...',
              dueDate: '2026-03-22',
              amount: 2500.0,
              paidAmount: 0.0,
              remaining: 2500.0,
              customerName: 'Cliente XYZ',
              categoryName: 'Serviços',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async getDashboard(@CurrentUser('accessToken') accessToken: string) {
    return this.dashboardService.getDashboard(accessToken);
  }
}
