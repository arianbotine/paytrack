-- CreateIndex
CREATE INDEX "payables_organization_id_status_due_date_idx" ON "payables"("organization_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "payables_organization_id_due_date_idx" ON "payables"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "payables_vendor_id_idx" ON "payables"("vendor_id");

-- CreateIndex
CREATE INDEX "payments_organization_id_payment_date_idx" ON "payments"("organization_id", "payment_date");

-- CreateIndex
CREATE INDEX "receivables_organization_id_status_due_date_idx" ON "receivables"("organization_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "receivables_organization_id_due_date_idx" ON "receivables"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "receivables_customer_id_idx" ON "receivables"("customer_id");

-- CreateIndex
CREATE INDEX "user_organizations_organization_id_is_active_idx" ON "user_organizations"("organization_id", "is_active");
