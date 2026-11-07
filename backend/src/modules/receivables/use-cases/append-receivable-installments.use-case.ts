import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { ReceivablesRepository } from '../repositories';
import { AppendReceivableInstallmentsDto } from '../dto/receivable.dto';
import { calculateInstallmentAmountsFromCents } from '../../../shared/utils/account.utils';
import { parseDateOnly } from '../../../shared/utils/date.utils';

@Injectable()
export class AppendReceivableInstallmentsUseCase {
  constructor(private readonly repository: ReceivablesRepository) {}

  async execute(
    receivableId: string,
    organizationId: string,
    dto: AppendReceivableInstallmentsDto
  ) {
    if (dto.dueDates.length !== dto.installmentCount) {
      throw new BadRequestException(
        `dueDates deve conter exatamente ${dto.installmentCount} datas`
      );
    }

    let amounts: Prisma.Decimal[];
    try {
      amounts = calculateInstallmentAmountsFromCents(
        dto.amountCents,
        dto.installmentCount
      );
    } catch {
      throw new BadRequestException(
        'O valor deve ser suficiente para gerar parcelas de pelo menos R$ 0,01'
      );
    }

    return this.repository.transaction(async tx => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "receivables" WHERE "id" = ${receivableId} AND "organization_id" = ${organizationId} FOR UPDATE`
      );

      const receivable = await tx.receivable.findFirst({
        where: { id: receivableId, organizationId },
        include: { installments: true },
      });

      if (!receivable) {
        throw new NotFoundException('Conta a receber não encontrada');
      }

      const hasOpenInstallment = receivable.installments.some(
        installment =>
          installment.status !== AccountStatus.PAID &&
          installment.amount.greaterThan(installment.receivedAmount)
      );
      if (receivable.status === AccountStatus.PAID || !hasOpenInstallment) {
        throw new BadRequestException(
          'Só é possível adicionar parcelas a uma conta com saldo em aberto'
        );
      }

      const lastDueDate = receivable.installments.reduce<Date | null>(
        (latest, installment) =>
          !latest || installment.dueDate > latest
            ? installment.dueDate
            : latest,
        null
      );
      const dueDates = dto.dueDates.map(parseDateOnly);
      if (lastDueDate && dueDates[0] <= lastDueDate) {
        throw new BadRequestException(
          'A primeira nova parcela deve vencer após o último vencimento existente'
        );
      }

      const lastInstallmentNumber = receivable.installments.reduce(
        (maximum, installment) =>
          Math.max(maximum, installment.installmentNumber),
        0
      );
      const totalInstallments = lastInstallmentNumber + dto.installmentCount;
      if (totalInstallments > 120) {
        throw new BadRequestException(
          'A conta não pode ter mais de 120 parcelas'
        );
      }

      const addedAmount = amounts.reduce(
        (sum, amount) => sum.plus(amount),
        new Prisma.Decimal(0)
      );
      const totalAmount = receivable.installments
        .reduce(
          (sum, installment) => sum.plus(installment.amount),
          new Prisma.Decimal(0)
        )
        .plus(addedAmount);
      const maximumAccountAmount = new Prisma.Decimal('9999999999999.99');
      if (totalAmount.greaterThan(maximumAccountAmount)) {
        throw new BadRequestException(
          'O novo total excede o limite financeiro permitido'
        );
      }

      await tx.receivableInstallment.updateMany({
        where: { receivableId },
        data: { totalInstallments },
      });
      await tx.receivableInstallment.createMany({
        data: amounts.map(
          (amount, index): Prisma.ReceivableInstallmentCreateManyInput => ({
            receivableId,
            organizationId,
            installmentNumber: lastInstallmentNumber + index + 1,
            totalInstallments,
            amount,
            receivedAmount: new Prisma.Decimal(0),
            dueDate: dueDates[index],
            status: AccountStatus.PENDING,
          })
        ),
      });

      return tx.receivable.update({
        where: { id: receivableId },
        data: { amount: totalAmount, totalInstallments },
        include: {
          installments: { orderBy: { installmentNumber: 'asc' } },
        },
      });
    });
  }
}
