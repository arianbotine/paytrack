-- AlterTable
ALTER TABLE "payable_installment_items" ADD COLUMN "category_id" TEXT;

-- CreateIndex
CREATE INDEX "payable_installment_items_category_id_idx" ON "payable_installment_items"("category_id");

-- AddForeignKey
ALTER TABLE "payable_installment_items" ADD CONSTRAINT "payable_installment_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
