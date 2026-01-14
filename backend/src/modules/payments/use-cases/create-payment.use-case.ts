import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
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
  private readonly logger = new Logger(CreatePaymentUseCase.name);

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
            reference: paymentData.reference,
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

      // Invalidar cache do dashboard e das listas de contas
      this.cacheService.del(`dashboard:summary:${organizationId}`);
      await Promise.all([
        this.cacheService.invalidate(`payables:list:${organizationId}`),
        this.cacheService.invalidate(`receivables:list:${organizationId}`),
      ]);

      return result;
    } catch (error) {
      // Log do erro para debug
      this.logger.error(
        `Erro ao criar pagamento: ${(error as Error).message}`,
        (error as Error).stack
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Erros conhecidos do Prisma (ex: violação de constraint)
        const errorMessages: Record<string, string> = {
          P2002: 'Já existe um pagamento com estes dados',
          P2003: 'Parcela informada não existe ou não pertence à organização',
          P2025: 'Registro não encontrado para atualização',
        };
        const message =
          errorMessages[error.code] ||
          `Erro ao processar pagamento: ${error.code}`;
        throw new BadRequestException(message);
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          'Erro de validação: verifique os dados do pagamento (valores, datas, método)'
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Erro genérico - log detalhado para debug
      this.logger.error(
        `Erro inesperado ao processar pagamento para organização ${organizationId}`,
        {
          error: (error as Error).message,
          stack: (error as Error).stack,
          dto,
        }
      );

      throw new BadRequestException(
        `Erro ao processar pagamento: ${(error as Error).message || 'erro desconhecido'}`
      );
    }
  }

  /**
   * Executa criação de pagamento dentro de uma transação existente
   * Usado quando pagamento é registrado durante criação de conta
   */
  async executeInTransaction(
    tx: any,
    organizationId: string,
    dto: CreatePaymentDto
  ) {
    const { allocations, ...paymentData } = dto;

    // Validar estrutura das alocações
    this.allocationsValidator.validateAllocationTargets(allocations);
    this.allocationsValidator.validateAllocationsSum(allocations, dto.amount);

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

    this.logger.log(
      `Pagamento de ${dto.amount} criado dentro da transação para ${allocations.length} parcelas`
    );

    return payment;
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
      reference: dto.reference,
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
