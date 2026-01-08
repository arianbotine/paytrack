/*
  Warnings:

  - You are about to drop the column `due_date` on the `payables` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `receivables` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ACCOUNT_DEBIT';

-- DropIndex
DROP INDEX "payables_organization_id_due_date_idx";

-- DropIndex
DROP INDEX "payables_organization_id_status_due_date_idx";

-- DropIndex
DROP INDEX "receivables_organization_id_due_date_idx";

-- DropIndex
DROP INDEX "receivables_organization_id_status_due_date_idx";

-- AlterTable
ALTER TABLE "payables" DROP COLUMN "due_date";

-- AlterTable
ALTER TABLE "receivables" DROP COLUMN "due_date";

-- CreateIndex
CREATE INDEX "payable_installments_payable_id_status_due_date_idx" ON "payable_installments"("payable_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "payables_organization_id_status_idx" ON "payables"("organization_id", "status");

-- CreateIndex
CREATE INDEX "receivable_installments_receivable_id_status_due_date_idx" ON "receivable_installments"("receivable_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "receivables_organization_id_status_idx" ON "receivables"("organization_id", "status");
