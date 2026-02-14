import { Injectable } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const DEFAULT_LIMIT = 50;

interface TagDto {
  id: string;
  name: string;
  color: string | null;
}

interface DueAlertItem {
  notificationId: string;
  accountType: 'PAYABLE' | 'RECEIVABLE';
  installmentId: string;
  accountId: string;
  counterpartyName: string;
  categoryName: string | null;
  tags: TagDto[];
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  pendingAmount: number;
  amount: number;
  paidAmount: number | null;
  receivedAmount: number | null;
  installmentNumber: number;
  totalInstallments: number;
  status: AccountStatus;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDueAlerts(organizationId: string, requestedLimit?: number) {
    const limit = Math.min(Math.max(requestedLimit || DEFAULT_LIMIT, 1), 200);

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        notificationLeadDays: true,
        notificationPollingSeconds: true,
        showOverdueNotifications: true,
      },
    });

    const today = this.getTodayUTC();
    const upcomingDeadline = this.addDaysUTC(
      today,
      organization.notificationLeadDays
    );

    const dueDateFilter = organization.showOverdueNotifications
      ? { lte: upcomingDeadline }
      : { gte: today, lte: upcomingDeadline };

    const [payableInstallments, receivableInstallments] = await Promise.all([
      this.prisma.payableInstallment.findMany({
        where: {
          organizationId,
          status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
          dueDate: dueDateFilter,
        },
        include: {
          tags: { include: { tag: true } },
          payable: {
            select: {
              id: true,
              vendor: { select: { name: true } },
              category: { select: { name: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      }),
      this.prisma.receivableInstallment.findMany({
        where: {
          organizationId,
          status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
          dueDate: dueDateFilter,
        },
        include: {
          tags: { include: { tag: true } },
          receivable: {
            select: {
              id: true,
              customer: { select: { name: true } },
              category: { select: { name: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      }),
    ]);

    const payableAlerts: DueAlertItem[] = payableInstallments.map(inst => {
      const dueDate = this.toDateOnly(inst.dueDate);
      const tags = this.mergeTags(inst.tags, inst.payable.tags);
      const pendingAmount = Number(inst.amount) - Number(inst.paidAmount);

      return {
        notificationId: `PAYABLE:${inst.id}:${dueDate}`,
        accountType: 'PAYABLE',
        installmentId: inst.id,
        accountId: inst.payable.id,
        counterpartyName: inst.payable.vendor.name,
        categoryName: inst.payable.category?.name || null,
        tags,
        dueDate,
        daysUntilDue: this.diffInDaysUTC(today, inst.dueDate),
        isOverdue: inst.dueDate < today,
        pendingAmount,
        amount: Number(inst.amount),
        paidAmount: Number(inst.paidAmount),
        receivedAmount: null,
        installmentNumber: inst.installmentNumber,
        totalInstallments: inst.totalInstallments,
        status: inst.status,
      };
    });

    const receivableAlerts: DueAlertItem[] = receivableInstallments.map(
      inst => {
        const dueDate = this.toDateOnly(inst.dueDate);
        const tags = this.mergeTags(inst.tags, inst.receivable.tags);
        const pendingAmount = Number(inst.amount) - Number(inst.receivedAmount);

        return {
          notificationId: `RECEIVABLE:${inst.id}:${dueDate}`,
          accountType: 'RECEIVABLE',
          installmentId: inst.id,
          accountId: inst.receivable.id,
          counterpartyName: inst.receivable.customer.name,
          categoryName: inst.receivable.category?.name || null,
          tags,
          dueDate,
          daysUntilDue: this.diffInDaysUTC(today, inst.dueDate),
          isOverdue: inst.dueDate < today,
          pendingAmount,
          amount: Number(inst.amount),
          paidAmount: null,
          receivedAmount: Number(inst.receivedAmount),
          installmentNumber: inst.installmentNumber,
          totalInstallments: inst.totalInstallments,
          status: inst.status,
        };
      }
    );

    const sortedAlerts = [...payableAlerts, ...receivableAlerts].sort(
      (a, b) => {
        if (a.isOverdue !== b.isOverdue) {
          return a.isOverdue ? -1 : 1;
        }

        if (a.isOverdue) {
          return a.dueDate.localeCompare(b.dueDate);
        }

        return a.dueDate.localeCompare(b.dueDate);
      }
    );

    const data = sortedAlerts.slice(0, limit);

    return {
      data,
      total: sortedAlerts.length,
      settings: {
        notificationLeadDays: organization.notificationLeadDays,
        notificationPollingSeconds: organization.notificationPollingSeconds,
        showOverdueNotifications: organization.showOverdueNotifications,
      },
    };
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
  }

  private addDaysUTC(baseDate: Date, days: number): Date {
    const result = new Date(baseDate);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private diffInDaysUTC(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const startUTC = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate()
    );
    const endUTC = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate()
    );

    return Math.round((endUTC - startUTC) / msPerDay);
  }

  private mergeTags(
    installmentTags: Array<{
      tag: { id: string; name: string; color: string | null };
    }>,
    accountTags: Array<{
      tag: { id: string; name: string; color: string | null };
    }>
  ): TagDto[] {
    const unique = new Map<string, TagDto>();

    [...accountTags, ...installmentTags].forEach(({ tag }) => {
      unique.set(tag.id, {
        id: tag.id,
        name: tag.name,
        color: tag.color || null,
      });
    });

    return Array.from(unique.values());
  }
}
