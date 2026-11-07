import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PayablesRepository } from '../repositories';
import { AppendPayableInstallmentsDto } from '../dto/payable.dto';
import { calculateInstallmentAmountsFromCents } from '../../../shared/utils/account.utils';
import { parseDateOnly } from '../../../shared/utils/date.utils';

@Injectable()
export class AppendPayableInstallmentsUseCase {
  constructor(private readonly repository: PayablesRepository) {}

  async execute(
    payableId: string,
    organizationId: string,
    dto: AppendPayableInstallmentsDto
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
        Prisma.sql`SELECT "id" FROM "payables" WHERE "id" = ${payableId} AND "organization_id" = ${organizationId} FOR UPDATE`
      );

      const payable = await tx.payable.findFirst({
        where: { id: payableId, organizationId },
        include: { installments: true },
      });

      if (!payable) {
        throw new NotFoundException('Conta a pagar não encontrada');
      }

      const hasOpenInstallment = payable.installments.some(
        installment =>
          installment.status !== AccountStatus.PAID &&
          installment.amount.greaterThan(installment.paidAmount)
      );
      if (payable.status === AccountStatus.PAID || !hasOpenInstallment) {
        throw new BadRequestException(
          'Só é possível adicionar parcelas a uma conta com saldo em aberto'
        );
      }

      const lastDueDate = payable.installments.reduce<Date | null>(
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

      const lastInstallmentNumber = payable.installments.reduce(
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
      const totalAmount = payable.installments
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

      await tx.payableInstallment.updateMany({
        where: { payableId },
        data: { totalInstallments },
      });
      await tx.payableInstallment.createMany({
        data: amounts.map(
          (amount, index): Prisma.PayableInstallmentCreateManyInput => ({
            payableId,
            organizationId,
            installmentNumber: lastInstallmentNumber + index + 1,
            totalInstallments,
            amount,
            paidAmount: new Prisma.Decimal(0),
            dueDate: dueDates[index],
            status: AccountStatus.PENDING,
          })
        ),
      });

      return tx.payable.update({
        where: { id: payableId },
        data: { amount: totalAmount, totalInstallments },
        include: {
          installments: { orderBy: { installmentNumber: 'asc' } },
        },
      });
    });
  }
}
