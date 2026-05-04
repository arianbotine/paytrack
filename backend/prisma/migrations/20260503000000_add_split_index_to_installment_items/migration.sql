-- AlterTable
ALTER TABLE "payable_installment_items" ADD COLUMN "split_index" INTEGER,
                                         ADD COLUMN "split_total" INTEGER,
                                         ADD COLUMN "split_group_id" UUID;

-- Backfill: registros existentes representam item único (1/1), cada um com seu próprio grupo
UPDATE "payable_installment_items" SET "split_index" = 1, "split_total" = 1, "split_group_id" = gen_random_uuid();
