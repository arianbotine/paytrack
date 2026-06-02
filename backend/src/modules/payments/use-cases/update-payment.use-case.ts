import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentsRepository } from '../repositories';
import { UpdatePaymentDto } from '../dto/payment.dto';

/**
 * Use Case: Atualizar um pagamento
 * Responsabilidade: atualizar data de registro, método, referência e notas
 * Nota: Não permite alterar valor ou alocações
 */
@Injectable()
export class UpdatePaymentUseCase {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async execute(id: string, organizationId: string, dto: UpdatePaymentDto) {
    const result = await this.paymentsRepository.transaction(async tx => {
      // Verificar se o pagamento existe e pertence à organização
      const payment = await tx.payment.findFirst({
        where: { id, organizationId },
      });

      if (!payment) {
        throw new NotFoundException('Pagamento não encontrado');
      }

      // Atualizar apenas campos permitidos
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          paymentDate: dto.paymentDate,
          ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
          ...(dto.reference !== undefined && { reference: dto.reference }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: {
          allocations: {
            include: {
              payableInstallment: {
                include: {
                  payable: {
                    include: {
                      vendor: true,
                    },
                  },
                },
              },
              receivableInstallment: {
                include: {
                  receivable: {
                    include: {
                      customer: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updatedPayment;
    });

    return result;
  }
}
