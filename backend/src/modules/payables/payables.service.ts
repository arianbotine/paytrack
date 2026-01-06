import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreatePayableDto,
  UpdatePayableDto,
  PayableFilterDto,
} from './dto/payable.dto';
import { CacheService } from '../../shared/services/cache.service';
import { AccountStatus, Prisma } from '@prisma/client';
import { parseDateOnly } from '../../shared/utils/date.utils';
import { MoneyUtils } from '../../shared/utils/money.utils';
import { generateInstallments } from '../../shared/utils/account.utils';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class PayablesService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly cacheService: CacheService
  ) {}

  protected invalidateDashboardCache(organizationId: string) {
    if (this.cacheService) {
      this.cacheService.del(`dashboard:summary:${organizationId}`);
    }
  }

  /**
   * Recalcula as parcelas quando o valor total é alterado
   */
  private async recalculateInstallments(
    payableId: string,
    organizationId: string,
    newAmount: number,
    installmentCount: number,
    existingDueDates: string[],
    description: string
  ): Promise<void> {
    // Deletar parcelas antigas
    await this.prisma.payableInstallment.deleteMany({
      where: { payableId },
    });

    // Criar novas parcelas com valores recalculados
    const newInstallments = generateInstallments(
      newAmount,
      installmentCount,
      existingDueDates,
      payableId,
      organizationId,
      description,
      'payable'
    ) as Prisma.PayableInstallmentCreateManyInput[];

    await this.prisma.payableInstallment.createMany({
      data: newInstallments,
    });
  }

  /**
   * Atualiza as datas de vencimento das parcelas
   */
  private async updateInstallmentDates(
    payableId: string,
    newDueDate: Date,
    installments: any[]
  ): Promise<void> {
    const installmentCount = installments.length;

    // Gerar novas datas de vencimento mensais
    const newDueDates: Date[] = [];
    for (let i = 0; i < installmentCount; i++) {
      const installmentDate = new Date(newDueDate);
      installmentDate.setUTCMonth(installmentDate.getUTCMonth() + i);
      newDueDates.push(installmentDate);
    }

    // Atualizar apenas parcelas pendentes ou vencidas
    const installmentsToUpdate = installments.filter(
      installment =>
        installment.status === AccountStatus.PENDING ||
        installment.status === AccountStatus.OVERDUE
    );

    await Promise.all(
      installmentsToUpdate.map(installment => {
        const originalIndex = installments.findIndex(
          inst => inst.id === installment.id
        );
        return this.prisma.payableInstallment.update({
          where: { id: installment.id },
          data: { dueDate: newDueDates[originalIndex] },
        });
      })
    );
  }

  async findAll(organizationId: string, filters?: PayableFilterDto) {
    const where: any = {
      organizationId,
      ...(filters?.vendorId && { vendorId: filters.vendorId }),
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.status &&
        filters.status.length > 0 && { status: { in: filters.status } }),
      ...(filters?.tagIds && filters.tagIds.length > 0
        ? {
            tags: {
              some: {
                tagId: { in: filters.tagIds },
              },
            },
          }
        : {}),
      ...(filters?.dueDateFrom || filters?.dueDateTo
        ? {
            dueDate: {
              ...(filters?.dueDateFrom && {
                gte: parseDateOnly(filters.dueDateFrom),
              }),
              ...(filters?.dueDateTo && {
                lte: parseDateOnly(filters.dueDateTo),
              }),
            },
          }
        : {}),
    };

    const take = filters?.take
      ? Math.min(filters.take, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = filters?.skip || 0;

    const [data, total] = await Promise.all([
      this.prisma.payable.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          installments: {
            select: {
              id: true,
              installmentNumber: true,
              totalInstallments: true,
              amount: true,
              paidAmount: true,
              dueDate: true,
              status: true,
              description: true,
            },
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.payable.count({ where }),
    ]);

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'paidAmount',
    ]);

    const mappedData = transformedData.map((item: any) => ({
      ...item,
      invoiceNumber: item.documentNumber,
      documentNumber: undefined,
    }));

    return { data: mappedData, total };
  }

  async findOne(id: string, organizationId: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, organizationId },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        installments: {
          select: {
            id: true,
            installmentNumber: true,
            totalInstallments: true,
            amount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
            description: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    const transformed = MoneyUtils.transformMoneyFields(payable, [
      'amount',
      'paidAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async create(organizationId: string, createDto: CreatePayableDto) {
    const { installmentCount = 1, dueDates, tagIds, ...baseData } = createDto;

    // Validação: dueDates obrigatório quando installmentCount > 1
    if (installmentCount > 1 && (!dueDates || dueDates.length === 0)) {
      throw new BadRequestException(
        'dueDates é obrigatório quando installmentCount > 1'
      );
    }

    // Validação: dueDates deve ter o mesmo tamanho que installmentCount
    if (dueDates && dueDates.length !== installmentCount) {
      throw new BadRequestException(
        `dueDates deve conter exatamente ${installmentCount} datas`
      );
    }

    // Criar conta + parcelas em transação
    const result = await this.prisma.$transaction(async tx => {
      // 1. Criar conta principal
      const payable = await tx.payable.create({
        data: {
          organizationId,
          vendorId: baseData.vendorId,
          categoryId: baseData.categoryId,
          description: baseData.description,
          amount: MoneyUtils.toDecimal(baseData.amount),
          dueDate: parseDateOnly(dueDates ? dueDates[0] : baseData.dueDate),
          notes: baseData.notes,
          documentNumber: baseData.invoiceNumber,
          totalInstallments: installmentCount,
          status: AccountStatus.PENDING,
          ...(tagIds && tagIds.length > 0
            ? {
                tags: {
                  create: tagIds.map((tagId: string) => ({ tagId })),
                },
              }
            : {}),
        },
      });

      // 2. Criar parcelas
      const installments = generateInstallments(
        baseData.amount,
        installmentCount,
        dueDates || [baseData.dueDate],
        payable.id,
        organizationId,
        baseData.description,
        'payable'
      ) as Prisma.PayableInstallmentCreateManyInput[];

      await tx.payableInstallment.createMany({
        data: installments,
      });

      // 3. Retornar conta com parcelas
      return tx.payable.findUnique({
        where: { id: payable.id },
        include: {
          vendor: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
      });
    });

    this.invalidateDashboardCache(organizationId);

    const transformed = MoneyUtils.transformMoneyFields(result!, [
      'amount',
      'paidAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdatePayableDto
  ) {
    const {
      tagIds,
      installmentCount: _installmentCount,
      dueDates: _dueDates,
      ...data
    } = updateDto;

    const payable = await this.prisma.payable.findFirst({
      where: { id, organizationId },
      include: {
        installments: {
          include: {
            allocations: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    const { vendorId, categoryId, invoiceNumber, ...updateData } = data;

    // Transform amount to Decimal if present
    if (updateData.amount !== undefined) {
      updateData.amount = MoneyUtils.toDecimal(updateData.amount);
    }

    // Validar se pode editar o valor: apenas se não houver nenhum pagamento em nenhuma parcela
    const hasAnyPayment = payable.installments.some(
      installment => installment.allocations.length > 0
    );

    if (data.amount !== undefined && hasAnyPayment) {
      throw new BadRequestException(
        'Não é possível alterar o valor de uma conta que já possui pagamentos registrados. Cancele os pagamentos para editar o valor.'
      );
    }

    // Se o valor foi alterado e não há pagamentos, recalcular as parcelas
    const shouldRecalculateInstallments =
      data.amount !== undefined &&
      !hasAnyPayment &&
      payable.installments.length > 0;

    if (shouldRecalculateInstallments) {
      const newAmount = MoneyUtils.toDecimal(data.amount);
      const installmentCount = payable.installments.length;
      const existingDueDates = payable.installments.map(inst => {
        const date = new Date(inst.dueDate);
        return date.toISOString().split('T')[0];
      });

      await this.recalculateInstallments(
        payable.id,
        organizationId,
        newAmount.toNumber(),
        installmentCount,
        existingDueDates,
        payable.description
      );
    }

    // Se a data de vencimento foi alterada e há parcelas, recalcular as datas
    const shouldUpdateInstallmentDates =
      data.dueDate &&
      payable.installments.length > 1 &&
      !shouldRecalculateInstallments;

    if (shouldUpdateInstallmentDates) {
      const newDueDate = parseDateOnly(data.dueDate);
      await this.updateInstallmentDates(
        payable.id,
        newDueDate,
        payable.installments
      );
    }

    const updated = await this.prisma.payable.update({
      where: { id },
      data: {
        ...updateData,
        ...(data.dueDate && { dueDate: parseDateOnly(data.dueDate) }),
        ...(vendorId && { vendor: { connect: { id: vendorId } } }),
        ...(categoryId !== undefined && {
          category: categoryId
            ? { connect: { id: categoryId } }
            : { disconnect: true },
        }),
        ...(tagIds && {
          tags: {
            deleteMany: {},
            create: tagIds.map(tagId => ({ tagId })),
          },
        }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    this.invalidateDashboardCache(organizationId);

    const transformed = MoneyUtils.transformMoneyFields(updated, [
      'amount',
      'paidAmount',
    ]);

    return {
      ...transformed,
      invoiceNumber: transformed.documentNumber,
      documentNumber: undefined,
    };
  }

  async remove(id: string, organizationId: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, organizationId },
      include: {
        installments: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    const hasPayments = payable.installments.some(
      i => i.allocations.length > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível excluir conta com pagamentos registrados'
      );
    }

    await this.prisma.payable.delete({
      where: { id },
    });

    this.invalidateDashboardCache(organizationId);
  }

  async cancel(id: string, organizationId: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, organizationId },
      include: { installments: true },
    });

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    if (payable.status === AccountStatus.CANCELLED) {
      throw new BadRequestException('Conta já está cancelada');
    }

    const hasPayments = payable.installments.some(
      i => Number(i.paidAmount) > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível cancelar conta com parcelas pagas'
      );
    }

    await this.prisma.$transaction([
      this.prisma.payable.update({
        where: { id },
        data: { status: AccountStatus.CANCELLED },
      }),
      this.prisma.payableInstallment.updateMany({
        where: { payableId: id },
        data: { status: AccountStatus.CANCELLED },
      }),
    ]);

    this.invalidateDashboardCache(organizationId);

    return this.findOne(id, organizationId);
  }

  async updateOverdueStatus() {
    // Usar data atual em UTC para evitar problemas de timezone
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

    const result = await this.prisma.payableInstallment.updateMany({
      where: {
        status: AccountStatus.PENDING,
        dueDate: { lt: todayUTC },
      },
      data: { status: AccountStatus.OVERDUE },
    });

    return result;
  }

  async getPayments(payableId: string, organizationId: string) {
    // Buscar payments que têm allocations para installments desta payable
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        allocations: {
          some: {
            payableInstallment: {
              payableId,
            },
          },
        },
      },
      include: {
        allocations: {
          where: {
            payableInstallment: {
              payableId,
            },
          },
          include: {
            payableInstallment: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // Transformar para o formato esperado
    return payments.map(payment => {
      // Pegar a primeira allocation (já filtrada)
      const allocation = payment.allocations[0];

      return {
        id: payment.id,
        amount: payment.amount,
        payment: {
          paymentDate: payment.paymentDate,
          method: payment.paymentMethod,
          notes: payment.notes,
        },
        installment: allocation?.payableInstallment
          ? {
              installmentNumber:
                allocation.payableInstallment.installmentNumber,
              totalInstallments:
                allocation.payableInstallment.totalInstallments,
              description: allocation.payableInstallment.description,
            }
          : undefined,
      };
    });
  }

  /**
   * Exclui uma parcela pendente e recalcula o valor total da conta
   */
  async deleteInstallment(
    payableId: string,
    installmentId: string,
    organizationId: string
  ) {
    // Buscar a conta com suas parcelas
    const payable = await this.prisma.payable.findFirst({
      where: { id: payableId, organizationId },
      include: {
        installments: {
          include: {
            allocations: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Verificar se há apenas uma parcela
    if (payable.installments.length === 1) {
      throw new BadRequestException(
        'Não é possível excluir a única parcela da conta. Exclua a conta inteira.'
      );
    }

    // Encontrar a parcela a ser excluída
    const installmentToDelete = payable.installments.find(
      inst => inst.id === installmentId
    );

    if (!installmentToDelete) {
      throw new NotFoundException('Parcela não encontrada');
    }

    // Verificar se a parcela está pendente
    if (installmentToDelete.status !== AccountStatus.PENDING) {
      throw new BadRequestException(
        'Apenas parcelas pendentes podem ser excluídas'
      );
    }

    // Verificar se a parcela tem pagamentos
    if (installmentToDelete.allocations.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir parcela que já possui pagamentos registrados'
      );
    }

    // Excluir a parcela e recalcular o valor total da conta
    await this.prisma.$transaction(async tx => {
      // 1. Excluir a parcela
      await tx.payableInstallment.delete({
        where: { id: installmentId },
      });

      // 2. Buscar parcelas restantes
      const remainingInstallments = await tx.payableInstallment.findMany({
        where: { payableId },
        orderBy: { installmentNumber: 'asc' },
      });

      // 3. Recalcular valor total e valor pago (somar todas as parcelas restantes)
      const newTotalAmount = remainingInstallments.reduce(
        (sum, inst) => sum.plus(inst.amount),
        new Prisma.Decimal(0)
      );
      const newPaidAmount = remainingInstallments.reduce(
        (sum, inst) => sum.plus(inst.paidAmount),
        new Prisma.Decimal(0)
      );

      // 4. Reavaliar status da conta baseado nas parcelas restantes
      let newStatus: AccountStatus;
      const allPaid = remainingInstallments.every(
        inst => inst.status === AccountStatus.PAID
      );
      const anyPaid = remainingInstallments.some(
        inst =>
          inst.status === AccountStatus.PAID ||
          inst.status === AccountStatus.PARTIAL
      );
      const anyOverdue = remainingInstallments.some(
        inst => inst.status === AccountStatus.OVERDUE
      );

      if (allPaid) {
        newStatus = AccountStatus.PAID;
      } else if (anyPaid) {
        newStatus = AccountStatus.PARTIAL;
      } else if (anyOverdue) {
        newStatus = AccountStatus.OVERDUE;
      } else {
        newStatus = AccountStatus.PENDING;
      }

      // 5. Renumerar as parcelas para manter sequência
      const newTotalInstallments = remainingInstallments.length;
      await Promise.all(
        remainingInstallments.map((inst, index) =>
          tx.payableInstallment.update({
            where: { id: inst.id },
            data: {
              installmentNumber: index + 1,
              totalInstallments: newTotalInstallments,
            },
          })
        )
      );

      // 6. Atualizar a conta com o novo valor total, valor pago e status
      await tx.payable.update({
        where: { id: payableId },
        data: {
          amount: newTotalAmount,
          paidAmount: newPaidAmount,
          status: newStatus,
          totalInstallments: newTotalInstallments,
        },
      });
    });

    this.invalidateDashboardCache(organizationId);

    // Retornar a conta atualizada
    return this.findOne(payableId, organizationId);
  }
}
