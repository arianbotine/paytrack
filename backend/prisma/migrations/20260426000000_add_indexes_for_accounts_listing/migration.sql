-- CreateIndex
CREATE INDEX "payables_organization_id_created_at_idx" ON "payables"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "receivables_organization_id_created_at_idx" ON "receivables"("organization_id", "created_at");
