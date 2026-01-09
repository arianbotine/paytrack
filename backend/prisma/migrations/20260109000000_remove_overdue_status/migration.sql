-- AlterEnum: Remove OVERDUE from AccountStatus
-- Step 1: Update all existing OVERDUE records to PENDING
UPDATE "payables" SET status = 'PENDING' WHERE status = 'OVERDUE';
UPDATE "receivables" SET status = 'PENDING' WHERE status = 'OVERDUE';
UPDATE "payable_installments" SET status = 'PENDING' WHERE status = 'OVERDUE';
UPDATE "receivable_installments" SET status = 'PENDING' WHERE status = 'OVERDUE';

-- Step 2: Drop DEFAULT constraints (required before type change)
ALTER TABLE "payables" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "receivables" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "payable_installments" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "receivable_installments" ALTER COLUMN status DROP DEFAULT;

-- Step 3: Remove OVERDUE value from the enum
ALTER TYPE "AccountStatus" RENAME TO "AccountStatus_old";
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');

-- Step 4: Alter column types using the new enum
ALTER TABLE "payables" ALTER COLUMN status TYPE "AccountStatus" USING status::text::"AccountStatus";
ALTER TABLE "receivables" ALTER COLUMN status TYPE "AccountStatus" USING status::text::"AccountStatus";
ALTER TABLE "payable_installments" ALTER COLUMN status TYPE "AccountStatus" USING status::text::"AccountStatus";
ALTER TABLE "receivable_installments" ALTER COLUMN status TYPE "AccountStatus" USING status::text::"AccountStatus";

-- Step 5: Drop old enum type
DROP TYPE "AccountStatus_old";

-- Step 6: Restore DEFAULT constraints
ALTER TABLE "payables" ALTER COLUMN status SET DEFAULT 'PENDING'::"AccountStatus";
ALTER TABLE "receivables" ALTER COLUMN status SET DEFAULT 'PENDING'::"AccountStatus";
ALTER TABLE "payable_installments" ALTER COLUMN status SET DEFAULT 'PENDING'::"AccountStatus";
ALTER TABLE "receivable_installments" ALTER COLUMN status SET DEFAULT 'PENDING'::"AccountStatus";
