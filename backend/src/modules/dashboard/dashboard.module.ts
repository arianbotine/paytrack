import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { PayablesModule } from "../payables/payables.module";
import { ReceivablesModule } from "../receivables/receivables.module";

@Module({
  imports: [PayablesModule, ReceivablesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
