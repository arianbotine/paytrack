import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsRepository } from '../repositories';
import {
  InstallmentBalanceManager,
  PaymentAllocationsValidator,
} from '../domain';
import { CreatePaymentDto, QuickPaymentDto } from '../dto/payment.dto';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { parseDatetime } from '../../../shared/utils/date.utils';
import { CacheService } from '../../../shared/services/cache.service';

/**
 * Use Case: Criar um novo pagamento
 * Responsabilidade: orquestrar criação de pagamento e atualizar saldos das parcelas
 */
@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly balanceManager: InstallmentBalanceManager,
    private readonly allocationsValidator: PaymentAllocationsValidator,
    private readonly cacheService: CacheService
  ) {}

  async execute(organizationId: string, dto: CreatePaymentDto) {
    try {
      const { allocations, ...paymentData } = dto;

      // Validar estrutura das alocações
      this.allocationsValidator.validateAllocationTargets(allocations);
      this.allocationsValidator.validateAllocationsSum(allocations, dto.amount);

      // Criar pagamento com alocações em transação
      const result = await this.paymentsRepository.transaction(async tx => {
        // Validar se parcelas existem
        await this.allocationsValidator.validateInstallmentsExist(
          tx,
          organizationId,
          allocations
        );

        // Criar pagamento
        const payment = await tx.payment.create({
          data: {
            organizationId,
            amount: MoneyUtils.toDecimal(paymentData.amount),
            paymentDate: parseDatetime(paymentData.paymentDate),
            paymentMethod: paymentData.paymentMethod,
            notes: paymentData.notes,
            allocations: {
              create: allocations.map(a => ({
                payableInstallmentId: a.payableInstallmentId,
                receivableInstallmentId: a.receivableInstallmentId,
                amount: MoneyUtils.toDecimal(a.amount),
              })),
            },
          },
          include: {
            allocations: {
              include: {
                payableInstallment: {
                  select: {
                    id: true,
                    installmentNumber: true,
                    totalInstallments: true,
                    payable: {
                      select: {
                        id: true,
                        vendor: { select: { name: true } },
                      },
                    },
                  },
                },
                receivableInstallment: {
                  select: {
                    id: true,
                    installmentNumber: true,
                    totalInstallments: true,
                    receivable: {
                      select: {
                        id: true,
                        customer: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Atualizar saldos das parcelas
        for (const allocation of allocations) {
          if (allocation.payableInstallmentId) {
            await this.balanceManager.updatePayableInstallmentBalance(
              tx,
              allocation.payableInstallmentId,
              allocation.amount
            );
          } else if (allocation.receivableInstallmentId) {
            await this.balanceManager.updateReceivableInstallmentBalance(
              tx,
              allocation.receivableInstallmentId,
              allocation.amount
            );
          }
        }

        return payment;
      });

      // Invalidar cache do dashboard
      this.cacheService.del(`dashboard:summary:${organizationId}`);

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(
          'Erro ao processar o pagamento: dados inválidos'
        );
      }
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          'Erro de validação nos dados do pagamento'
        );
      }
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Erro interno ao processar o pagamento');
    }
  }
}

/**
 * Use Case: Criar pagamento rápido (para uma única parcela)
 */
@Injectable()
export class QuickPaymentUseCase {
  constructor(private readonly createPaymentUseCase: CreatePaymentUseCase) {}

  async execute(organizationId: string, dto: QuickPaymentDto) {
    const createDto: CreatePaymentDto = {
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      allocations: [
        {
          ...(dto.type === 'payable'
            ? { payableInstallmentId: dto.installmentId }
            : { receivableInstallmentId: dto.installmentId }),
          amount: dto.amount,
        },
      ],
    };

    return this.createPaymentUseCase.execute(organizationId, createDto);
  }
}
