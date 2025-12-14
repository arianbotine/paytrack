/*
  Warnings:

  - You are about to drop the column `paid_amount` on the `receivables` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "receivables" DROP COLUMN "paid_amount",
ADD COLUMN     "received_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;
