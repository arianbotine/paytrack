import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreateReceivableDto,
  UpdateReceivableDto,
  ReceivableFilterDto,
} from './dto/receivable.dto';
import { CacheService } from '../../shared/services/cache.service';
import { AccountStatus, Prisma } from '@prisma/client';
import { parseDateOnly } from '../../shared/utils/date.utils';
import { MoneyUtils } from '../../shared/utils/money.utils';
import { generateInstallments } from '../../shared/utils/account.utils';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class ReceivablesService {
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
    receivableId: string,
    organizationId: string,
    newAmount: number,
    installmentCount: number,
    existingDueDates: string[],
    description: string
  ): Promise<void> {
    // Deletar parcelas antigas
    await this.prisma.receivableInstallment.deleteMany({
      where: { receivableId },
    });

    // Criar novas parcelas com valores recalculados
    const newInstallments = generateInstallments(
      newAmount,
      installmentCount,
      existingDueDates,
      receivableId,
      organizationId,
      description,
      'receivable'
    ) as Prisma.ReceivableInstallmentCreateManyInput[];

    await this.prisma.receivableInstallment.createMany({
      data: newInstallments,
    });
  }

  /**
   * Atualiza as datas de vencimento das parcelas
   */
  private async updateInstallmentDates(
    receivableId: string,
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
        return this.prisma.receivableInstallment.update({
          where: { id: installment.id },
          data: { dueDate: newDueDates[originalIndex] },
        });
      })
    );
  }

  async findAll(organizationId: string, filters?: ReceivableFilterDto) {
    const where: any = {
      organizationId,
      ...(filters?.customerId && { customerId: filters.customerId }),
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
      this.prisma.receivable.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
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
              receivedAmount: true,
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
      this.prisma.receivable.count({ where }),
    ]);

    const transformedData = MoneyUtils.transformMoneyFieldsArray(data, [
      'amount',
      'receivedAmount',
    ]);

    const mappedData = transformedData.map((item: any) => ({
      ...item,
    }));

    return { data: mappedData, total };
  }

  async findOne(id: string, organizationId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
      include: {
        customer: { select: { id: true, name: true } },
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
            receivedAmount: true,
            dueDate: true,
            status: true,
            description: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const transformed = MoneyUtils.transformMoneyFields(receivable, [
      'amount',
      'receivedAmount',
    ]);

    return {
      ...transformed,
    };
  }

  async create(organizationId: string, createDto: CreateReceivableDto) {
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
      const receivable = await tx.receivable.create({
        data: {
          organizationId,
          customerId: baseData.customerId,
          categoryId: baseData.categoryId,
          description: baseData.description,
          amount: MoneyUtils.toDecimal(baseData.amount),
          dueDate: parseDateOnly(dueDates ? dueDates[0] : baseData.dueDate),
          notes: baseData.notes,
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
        receivable.id,
        organizationId,
        baseData.description,
        'receivable'
      ) as Prisma.ReceivableInstallmentCreateManyInput[];

      await tx.receivableInstallment.createMany({
        data: installments,
      });

      // 3. Retornar conta com parcelas
      return tx.receivable.findUnique({
        where: { id: receivable.id },
        include: {
          customer: { select: { id: true, name: true } },
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
      'receivedAmount',
    ]);

    return {
      ...transformed,
    };
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateReceivableDto
  ) {
    const {
      tagIds,
      installmentCount: _installmentCount,
      dueDates: _dueDates,
      ...data
    } = updateDto;

    const receivable = await this.prisma.receivable.findFirst({
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

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const { customerId, categoryId, ...updateData } = data;

    // Validar se pode editar o valor: apenas se não houver nenhum pagamento em nenhuma parcela
    const hasAnyPayment = receivable.installments.some(
      installment => installment.allocations.length > 0
    );

    if (data.amount !== undefined && hasAnyPayment) {
      throw new BadRequestException(
        'Não é possível alterar o valor de uma conta que já possui recebimentos registrados. Cancele os recebimentos para editar o valor.'
      );
    }

    // Se o valor foi alterado e não há pagamentos, recalcular as parcelas
    const shouldRecalculateInstallments =
      data.amount !== undefined &&
      !hasAnyPayment &&
      receivable.installments.length > 0;

    if (shouldRecalculateInstallments) {
      const newAmount = MoneyUtils.toDecimal(data.amount);
      const installmentCount = receivable.installments.length;
      const existingDueDates = receivable.installments.map(inst => {
        const date = new Date(inst.dueDate);
        return date.toISOString().split('T')[0];
      });

      await this.recalculateInstallments(
        receivable.id,
        organizationId,
        newAmount.toNumber(),
        installmentCount,
        existingDueDates,
        receivable.description
      );
    }

    // Se a data de vencimento foi alterada e há parcelas, recalcular as datas
    const shouldUpdateInstallmentDates =
      data.dueDate &&
      receivable.installments.length > 1 &&
      !shouldRecalculateInstallments;

    if (shouldUpdateInstallmentDates) {
      const newDueDate = parseDateOnly(data.dueDate);
      await this.updateInstallmentDates(
        receivable.id,
        newDueDate,
        receivable.installments
      );
    }

    const updated = await this.prisma.receivable.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.amount !== undefined && {
          amount: MoneyUtils.toDecimal(updateData.amount),
        }),
        ...(data.dueDate && { dueDate: parseDateOnly(data.dueDate) }),
        ...(customerId && { customer: { connect: { id: customerId } } }),
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
        customer: { select: { id: true, name: true } },
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
      'receivedAmount',
    ]);

    return {
      ...transformed,
    };
  }

  async remove(id: string, organizationId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
      include: {
        installments: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const hasPayments = receivable.installments.some(
      i => i.allocations.length > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível excluir conta com pagamentos registrados'
      );
    }

    await this.prisma.receivable.delete({
      where: { id },
    });

    this.invalidateDashboardCache(organizationId);
  }

  async cancel(id: string, organizationId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, organizationId },
      include: { installments: true },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    if (receivable.status === AccountStatus.CANCELLED) {
      throw new BadRequestException('Conta já está cancelada');
    }

    const hasPayments = receivable.installments.some(
      i => Number(i.receivedAmount) > 0
    );

    if (hasPayments) {
      throw new BadRequestException(
        'Não é possível cancelar conta com parcelas recebidas'
      );
    }

    await this.prisma.$transaction([
      this.prisma.receivable.update({
        where: { id },
        data: { status: AccountStatus.CANCELLED },
      }),
      this.prisma.receivableInstallment.updateMany({
        where: { receivableId: id },
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

    const result = await this.prisma.receivableInstallment.updateMany({
      where: {
        status: AccountStatus.PENDING,
        dueDate: { lt: todayUTC },
      },
      data: { status: AccountStatus.OVERDUE },
    });

    return result;
  }

  async getPayments(receivableId: string, organizationId: string) {
    // Buscar payments que têm allocations para installments desta receivable
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        allocations: {
          some: {
            receivableInstallment: {
              receivableId,
            },
          },
        },
      },
      include: {
        allocations: {
          where: {
            receivableInstallment: {
              receivableId,
            },
          },
          include: {
            receivableInstallment: true,
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
        installment: allocation?.receivableInstallment
          ? {
              installmentNumber:
                allocation.receivableInstallment.installmentNumber,
              totalInstallments:
                allocation.receivableInstallment.totalInstallments,
              description: allocation.receivableInstallment.description,
            }
          : undefined,
      };
    });
  }

  /**
   * Exclui uma parcela pendente e recalcula o valor total da conta
   */
  async deleteInstallment(
    receivableId: string,
    installmentId: string,
    organizationId: string
  ) {
    // Buscar a conta com suas parcelas
    const receivable = await this.prisma.receivable.findFirst({
      where: { id: receivableId, organizationId },
      include: {
        installments: {
          include: {
            allocations: true,
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!receivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Verificar se há apenas uma parcela
    if (receivable.installments.length === 1) {
      throw new BadRequestException(
        'Não é possível excluir a única parcela da conta. Exclua a conta inteira.'
      );
    }

    // Encontrar a parcela a ser excluída
    const installmentToDelete = receivable.installments.find(
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

    // Verificar se a parcela tem recebimentos
    if (installmentToDelete.allocations.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir parcela que já possui recebimentos registrados'
      );
    }

    // Excluir a parcela e recalcular o valor total da conta
    await this.prisma.$transaction(async tx => {
      // 1. Excluir a parcela
      await tx.receivableInstallment.delete({
        where: { id: installmentId },
      });

      // 2. Buscar parcelas restantes
      const remainingInstallments = await tx.receivableInstallment.findMany({
        where: { receivableId },
        orderBy: { installmentNumber: 'asc' },
      });

      // 3. Recalcular valor total e valor recebido (somar todas as parcelas restantes)
      const newTotalAmount = remainingInstallments.reduce(
        (sum, inst) => sum.plus(inst.amount),
        new Prisma.Decimal(0)
      );
      const newReceivedAmount = remainingInstallments.reduce(
        (sum, inst) => sum.plus(inst.receivedAmount),
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
          tx.receivableInstallment.update({
            where: { id: inst.id },
            data: {
              installmentNumber: index + 1,
              totalInstallments: newTotalInstallments,
            },
          })
        )
      );

      // 6. Atualizar a conta com o novo valor total, valor recebido e status
      await tx.receivable.update({
        where: { id: receivableId },
        data: {
          amount: newTotalAmount,
          receivedAmount: newReceivedAmount,
          status: newStatus,
          totalInstallments: newTotalInstallments,
        },
      });
    });

    this.invalidateDashboardCache(organizationId);

    // Retornar a conta atualizada
    return this.findOne(receivableId, organizationId);
  }
}
