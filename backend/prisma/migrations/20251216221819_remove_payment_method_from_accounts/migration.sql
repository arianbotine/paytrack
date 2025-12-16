/*
  Warnings:

  - You are about to drop the column `payment_method` on the `payables` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `receivables` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "payables" DROP COLUMN "payment_method";

-- AlterTable
ALTER TABLE "receivables" DROP COLUMN "payment_method";
