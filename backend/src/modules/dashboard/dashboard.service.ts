import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AccountStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PayablesService } from "../payables/payables.service";
import { ReceivablesService } from "../receivables/receivables.service";

type GroupedItem = {
  _sum: {
    amount: import("@prisma/client").Decimal | null;
    paidAmount: import("@prisma/client").Decimal | null;
  };
  _count: number;
  status: AccountStatus;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payablesService: PayablesService,
    private readonly receivablesService: ReceivablesService
  ) {}

  async getSummary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    // Payables summary
    const payables = await this.prisma.payable.groupBy({
      by: ["status"],
      where: { organizationId },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });

    // Receivables summary
    const receivables = await this.prisma.receivable.groupBy({
      by: ["status"],
      where: { organizationId },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });

    // Overdue payables
    const overduePayables = await this.prisma.payable.findMany({
      where: {
        organizationId,
        status: AccountStatus.OVERDUE,
      },
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Overdue receivables
    const overdueReceivables = await this.prisma.receivable.findMany({
      where: {
        organizationId,
        status: AccountStatus.OVERDUE,
      },
      include: {
        customer: { select: { name: true } },
        category: { select: { name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Upcoming payables (next 7 days)
    const upcomingPayables = await this.prisma.payable.findMany({
      where: {
        organizationId,
        status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
        dueDate: { gte: today, lte: in7Days },
      },
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Upcoming receivables (next 7 days)
    const upcomingReceivables = await this.prisma.receivable.findMany({
      where: {
        organizationId,
        status: { in: [AccountStatus.PENDING, AccountStatus.PARTIAL] },
        dueDate: { gte: today, lte: in7Days },
      },
      include: {
        customer: { select: { name: true } },
        category: { select: { name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Calculate totals
    const payableTotals = this.calculateTotals(payables);
    const receivableTotals = this.calculateTotals(receivables);

    return {
      payables: {
        totals: payableTotals,
        overdue: overduePayables,
        upcoming: upcomingPayables,
      },
      receivables: {
        totals: receivableTotals,
        overdue: overdueReceivables,
        upcoming: upcomingReceivables,
      },
      balance: {
        toReceive:
          receivableTotals.pending +
          receivableTotals.partial +
          receivableTotals.overdue,
        toPay:
          payableTotals.pending + payableTotals.partial + payableTotals.overdue,
        net:
          receivableTotals.pending +
          receivableTotals.partial +
          receivableTotals.overdue -
          (payableTotals.pending +
            payableTotals.partial +
            payableTotals.overdue),
      },
    };
  }

  private calculateTotals(grouped: GroupedItem[]) {
    const totals = {
      total: 0,
      paid: 0,
      pending: 0,
      partial: 0,
      overdue: 0,
      cancelled: 0,
      count: 0,
    };

    for (const group of grouped) {
      const amount = Number(group._sum.amount || 0);
      const paidAmount = Number(group._sum.paidAmount || 0);
      const remaining = amount - paidAmount;

      totals.count += group._count;
      totals.total += amount;

      switch (group.status) {
        case AccountStatus.PAID:
          totals.paid += amount;
          break;
        case AccountStatus.PENDING:
          totals.pending += remaining;
          break;
        case AccountStatus.PARTIAL:
          totals.partial += remaining;
          break;
        case AccountStatus.OVERDUE:
          totals.overdue += remaining;
          break;
        case AccountStatus.CANCELLED:
          totals.cancelled += amount;
          break;
      }
    }

    return totals;
  }

  // Cron job to update overdue status daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateOverdueStatus() {
    console.log("🔄 Running overdue status update...");

    const payablesResult = await this.payablesService.updateOverdueStatus();
    const receivablesResult =
      await this.receivablesService.updateOverdueStatus();

    console.log(
      `✅ Updated ${payablesResult.count} payables and ${receivablesResult.count} receivables to OVERDUE status`
    );
  }
}
