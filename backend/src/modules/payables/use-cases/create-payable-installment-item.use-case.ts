import { randomUUID } from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CreateInstallmentItemDto,
  AffectedInstallmentCapacity,
} from '../dto/payable.dto';
import {
  PayablesRepository,
  PayableInstallmentsRepository,
} from '../repositories';
import { MoneyUtils } from '../../../shared/utils/money.utils';
import { InstallmentItemHelpersService } from '../services/installment-item-helpers.service';
import { ListPayableInstallmentItemsUseCase } from './list-payable-installment-items.use-case';

@Injectable()
export class CreatePayableInstallmentItemUseCase {
  constructor(
    private readonly payablesRepository: PayablesRepository,
    private readonly payableInstallmentsRepository: PayableInstallmentsRepository,
    private readonly helpers: InstallmentItemHelpersService,
    private readonly listPayableInstallmentItemsUseCase: ListPayableInstallmentItemsUseCase
  ) {}

  async execute(
    payableId: string,
    installmentId: string,
    organizationId: string | undefined,
    dto: CreateInstallmentItemDto
  ) {
    const normalizedDescription = dto.description.trim();
    if (!normalizedDescription) {
      throw new BadRequestException('Descrição do item é obrigatória');
    }

    const normalizedTagIds = this.helpers.normalizeTagIds(dto.tagIds);
    const splitCount = dto.splitCount ?? 1;
    const forceAdjust = dto.forceAdjustInstallmentAmount ?? false;
    const categoryId = dto.categoryId ?? null;

    if (splitCount === 1) {
      await this.createSingleItem(
        payableId,
        installmentId,
        organizationId,
        normalizedDescription,
        normalizedTagIds,
        dto.amount,
        categoryId,
        dto.sortOrder
      );
    } else {
      await this.createSplitItems(
        payableId,
        installmentId,
        organizationId,
        normalizedDescription,
        normalizedTagIds,
        dto.amount,
        categoryId,
        splitCount,
        forceAdjust
      );
    }

    return this.listPayableInstallmentItemsUseCase.execute(
      payableId,
      installmentId,
      organizationId
    );
  }

  // ─── Single-installment path (original behaviour) ────────────────────────

  private async createSingleItem(
    payableId: string,
    installmentId: string,
    organizationId: string | undefined,
    description: string,
    tagIds: string[],
    amount: number,
    categoryId: string | null,
    sortOrder?: number
  ) {
    await this.payablesRepository.transaction(async prisma => {
      const installment = await this.helpers.ensureInstallmentExists(
        prisma,
        payableId,
        installmentId,
        organizationId
      );

      const resolvedOrgId = installment.organizationId;

      await this.helpers.ensureTagsBelongToOrganization(
        prisma,
        resolvedOrgId,
        tagIds
      );

      const currentTotal = await this.helpers.getItemsTotal(
        prisma,
        installmentId,
        resolvedOrgId
      );

      if (
        this.helpers.roundMoney(currentTotal + amount) >
        Number(installment.amount)
      ) {
        throw new BadRequestException(
          'A soma dos itens da parcela não pode ser maior que o valor da parcela'
        );
      }

      const order =
        sortOrder ??
        (await this.helpers.getNextSortOrder(
          prisma,
          installmentId,
          resolvedOrgId
        ));

      const createdItem = await prisma.payableInstallmentItem.create({
        data: {
          organizationId: resolvedOrgId,
          payableInstallmentId: installmentId,
          description,
          amount: MoneyUtils.toDecimal(amount),
          sortOrder: order,
          ...(categoryId !== null && { categoryId }),
        },
      });

      if (tagIds.length > 0) {
        await prisma.payableInstallmentItemTag.createMany({
          data: tagIds.map(tagId => ({
            payableInstallmentItemId: createdItem.id,
            tagId,
          })),
        });
      }
    });
  }

  // ─── Multi-installment (split) path ──────────────────────────────────────

  private async createSplitItems(
    payableId: string,
    installmentId: string,
    organizationId: string | undefined,
    description: string,
    tagIds: string[],
    totalAmount: number,
    categoryId: string | null,
    splitCount: number,
    forceAdjust: boolean
  ) {
    // 1. Load current installment to get installmentNumber and orgId
    const currentInstallment =
      await this.payableInstallmentsRepository.findFirst(
        {
          id: installmentId,
          payableId,
          ...(organizationId ? { organizationId } : {}),
        },
        {
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            organizationId: true,
          },
        }
      );

    if (!currentInstallment) {
      throw new NotFoundException('Parcela não encontrada');
    }

    const resolvedOrgId = currentInstallment.organizationId;
    const currentNumber = currentInstallment.installmentNumber;

    // 2. Load all installments of this payable to find targets
    const allInstallments = await this.payableInstallmentsRepository.findMany(
      { payableId, organizationId: resolvedOrgId },
      {
        orderBy: [{ installmentNumber: 'asc' }],
      }
    );

    // 3. Determine target installment numbers
    const targetNumbers: number[] = [];
    for (let i = 0; i < splitCount; i++) {
      targetNumbers.push(currentNumber + i);
    }

    // 4. Verify all target installments exist
    const installmentByNumber = new Map(
      allInstallments.map(inst => [inst.installmentNumber, inst])
    );

    const missingNumbers = targetNumbers.filter(
      n => !installmentByNumber.has(n)
    );
    if (missingNumbers.length > 0) {
      throw new BadRequestException({
        message: `As parcelas ${missingNumbers.join(', ')} não existem neste parcelamento. Reduza a quantidade de parcelas ou adicione as parcelas manualmente antes de prosseguir.`,
        code: 'INSTALLMENTS_NOT_FOUND',
        missingInstallmentNumbers: missingNumbers,
      });
    }

    // 5. Calculate split amounts (floor for N-1 installments, remainder to first)
    const baseAmount = Math.floor((totalAmount * 100) / splitCount) / 100;
    const remainderAmount = this.helpers.roundMoney(
      totalAmount - baseAmount * (splitCount - 1)
    );

    const splitAmounts = targetNumbers.map((_, idx) =>
      idx === 0 ? remainderAmount : baseAmount
    );

    // 6. Check capacity for each target installment (inside a transaction)
    await this.payablesRepository.transaction(async prisma => {
      await this.helpers.ensureTagsBelongToOrganization(
        prisma,
        resolvedOrgId,
        tagIds
      );

      const affectedInstallments: AffectedInstallmentCapacity[] = [];

      for (let idx = 0; idx < targetNumbers.length; idx++) {
        const targetNumber = targetNumbers[idx];
        const targetInst = installmentByNumber.get(targetNumber)!;
        const splitAmt = splitAmounts[idx];

        const currentTotal = await this.helpers.getItemsTotal(
          prisma,
          targetInst.id,
          resolvedOrgId
        );

        const capacity = this.helpers.roundMoney(
          Number(targetInst.amount) - currentTotal
        );

        if (splitAmt > capacity) {
          affectedInstallments.push({
            installmentNumber: targetNumber,
            installmentId: targetInst.id,
            currentCapacity: capacity,
            splitAmount: splitAmt,
            adjustmentNeeded: this.helpers.roundMoney(splitAmt - capacity),
          });
        }
      }

      if (affectedInstallments.length > 0 && !forceAdjust) {
        throw new UnprocessableEntityException({
          message:
            'Algumas parcelas não comportam o valor do item parcelado. Confirme se deseja ajustar automaticamente o valor das parcelas afetadas.',
          code: 'INSTALLMENT_CAPACITY_EXCEEDED',
          affectedInstallments,
        });
      }

      // 7. Block if any affected installment is fully paid
      if (affectedInstallments.length > 0) {
        const paidAffected = affectedInstallments.filter(a => {
          const inst = installmentByNumber.get(a.installmentNumber)!;
          return inst.status === 'PAID';
        });
        if (paidAffected.length > 0) {
          const paidNumbers = paidAffected
            .map(a => a.installmentNumber)
            .join(', ');
          throw new BadRequestException({
            message: `As parcelas ${paidNumbers} estão totalmente pagas e não podem ter seu valor alterado. Remova essas parcelas do parcelamento ou ajuste o valor manualmente.`,
            code: 'PAID_INSTALLMENT_CANNOT_BE_ADJUSTED',
            paidInstallmentNumbers: paidAffected.map(a => a.installmentNumber),
          });
        }
      }

      // 8. Adjust installment amounts if forced
      if (affectedInstallments.length > 0 && forceAdjust) {
        for (const affected of affectedInstallments) {
          const targetInst = installmentByNumber.get(
            affected.installmentNumber
          )!;
          await prisma.payableInstallment.update({
            where: { id: targetInst.id },
            data: {
              amount: MoneyUtils.toDecimal(
                this.helpers.roundMoney(
                  Number(targetInst.amount) + affected.adjustmentNeeded
                )
              ),
            },
          });
        }
      }

      // 8. Create one item per target installment
      const splitGroupId = randomUUID();

      for (let idx = 0; idx < targetNumbers.length; idx++) {
        const targetNumber = targetNumbers[idx];
        const targetInst = installmentByNumber.get(targetNumber)!;
        const splitAmt = splitAmounts[idx];

        const sortOrder = await this.helpers.getNextSortOrder(
          prisma,
          targetInst.id,
          resolvedOrgId
        );

        const createdItem = await prisma.payableInstallmentItem.create({
          data: {
            organizationId: resolvedOrgId,
            payableInstallmentId: targetInst.id,
            description,
            amount: MoneyUtils.toDecimal(splitAmt),
            sortOrder,
            splitIndex: idx + 1,
            splitTotal: splitCount,
            splitGroupId,
            ...(categoryId !== null && { categoryId }),
          },
        });

        if (tagIds.length > 0) {
          await prisma.payableInstallmentItemTag.createMany({
            data: tagIds.map(tagId => ({
              payableInstallmentItemId: createdItem.id,
              tagId,
            })),
          });
        }
      }
    });
  }
}
