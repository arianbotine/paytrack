/*
  Warnings:

  - The values [CANCELLED] on the enum `AccountStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountStatus_new" AS ENUM ('PENDING', 'PARTIAL', 'PAID');
ALTER TABLE "public"."payable_installments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."payables" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."receivable_installments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."receivables" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payables" ALTER COLUMN "status" TYPE "AccountStatus_new" USING ("status"::text::"AccountStatus_new");
ALTER TABLE "payable_installments" ALTER COLUMN "status" TYPE "AccountStatus_new" USING ("status"::text::"AccountStatus_new");
ALTER TABLE "receivables" ALTER COLUMN "status" TYPE "AccountStatus_new" USING ("status"::text::"AccountStatus_new");
ALTER TABLE "receivable_installments" ALTER COLUMN "status" TYPE "AccountStatus_new" USING ("status"::text::"AccountStatus_new");
ALTER TYPE "AccountStatus" RENAME TO "AccountStatus_old";
ALTER TYPE "AccountStatus_new" RENAME TO "AccountStatus";
DROP TYPE "public"."AccountStatus_old";
ALTER TABLE "payable_installments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "payables" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "receivable_installments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "receivables" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
