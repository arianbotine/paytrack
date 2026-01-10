-- CreateIndex
CREATE INDEX "categories_organization_id_idx" ON "categories"("organization_id");

-- CreateIndex
CREATE INDEX "customers_organization_id_idx" ON "customers"("organization_id");

-- CreateIndex
CREATE INDEX "payable_tags_payable_id_idx" ON "payable_tags"("payable_id");

-- CreateIndex
CREATE INDEX "payable_tags_tag_id_idx" ON "payable_tags"("tag_id");

-- CreateIndex
CREATE INDEX "payables_category_id_idx" ON "payables"("category_id");

-- CreateIndex
CREATE INDEX "payables_organization_id_category_id_idx" ON "payables"("organization_id", "category_id");

-- CreateIndex
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_payable_installment_id_idx" ON "payment_allocations"("payable_installment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_receivable_installment_id_idx" ON "payment_allocations"("receivable_installment_id");

-- CreateIndex
CREATE INDEX "receivable_tags_receivable_id_idx" ON "receivable_tags"("receivable_id");

-- CreateIndex
CREATE INDEX "receivable_tags_tag_id_idx" ON "receivable_tags"("tag_id");

-- CreateIndex
CREATE INDEX "receivables_category_id_idx" ON "receivables"("category_id");

-- CreateIndex
CREATE INDEX "receivables_organization_id_category_id_idx" ON "receivables"("organization_id", "category_id");

-- CreateIndex
CREATE INDEX "tags_organization_id_idx" ON "tags"("organization_id");

-- CreateIndex
CREATE INDEX "vendors_organization_id_idx" ON "vendors"("organization_id");
