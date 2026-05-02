-- CreateTable
CREATE TABLE "payable_installment_items" (
    "id" TEXT NOT NULL,
    "payable_installment_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payable_installment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_installment_item_tags" (
    "payable_installment_item_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "payable_installment_item_tags_pkey" PRIMARY KEY ("payable_installment_item_id","tag_id")
);

-- CreateIndex
CREATE INDEX "payable_installment_items_payable_installment_id_idx" ON "payable_installment_items"("payable_installment_id");

-- CreateIndex
CREATE INDEX "payable_installment_items_organization_id_payable_installment_id_idx" ON "payable_installment_items"("organization_id", "payable_installment_id");

-- CreateIndex
CREATE INDEX "payable_installment_items_payable_installment_id_sort_order_idx" ON "payable_installment_items"("payable_installment_id", "sort_order");

-- CreateIndex
CREATE INDEX "payable_installment_item_tags_payable_installment_item_id_idx" ON "payable_installment_item_tags"("payable_installment_item_id");

-- CreateIndex
CREATE INDEX "payable_installment_item_tags_tag_id_idx" ON "payable_installment_item_tags"("tag_id");

-- CreateIndex
CREATE INDEX "payable_installment_item_tags_tag_id_payable_installment_item_id_idx" ON "payable_installment_item_tags"("tag_id", "payable_installment_item_id");

-- AddForeignKey
ALTER TABLE "payable_installment_items" ADD CONSTRAINT "payable_installment_items_payable_installment_id_fkey" FOREIGN KEY ("payable_installment_id") REFERENCES "payable_installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_installment_items" ADD CONSTRAINT "payable_installment_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_installment_item_tags" ADD CONSTRAINT "payable_installment_item_tags_payable_installment_item_id_fkey" FOREIGN KEY ("payable_installment_item_id") REFERENCES "payable_installment_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_installment_item_tags" ADD CONSTRAINT "payable_installment_item_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
