-- AlterTable
ALTER TABLE "payable_installments" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "receivable_installments" ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "payable_installment_tags" (
    "payable_installment_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "payable_installment_tags_pkey" PRIMARY KEY ("payable_installment_id","tag_id")
);

-- CreateTable
CREATE TABLE "receivable_installment_tags" (
    "receivable_installment_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "receivable_installment_tags_pkey" PRIMARY KEY ("receivable_installment_id","tag_id")
);

-- CreateIndex
CREATE INDEX "payable_installment_tags_payable_installment_id_idx" ON "payable_installment_tags"("payable_installment_id");

-- CreateIndex
CREATE INDEX "payable_installment_tags_tag_id_idx" ON "payable_installment_tags"("tag_id");

-- CreateIndex
CREATE INDEX "payable_installment_tags_tag_id_payable_installment_id_idx" ON "payable_installment_tags"("tag_id", "payable_installment_id");

-- CreateIndex
CREATE INDEX "receivable_installment_tags_receivable_installment_id_idx" ON "receivable_installment_tags"("receivable_installment_id");

-- CreateIndex
CREATE INDEX "receivable_installment_tags_tag_id_idx" ON "receivable_installment_tags"("tag_id");

-- CreateIndex
CREATE INDEX "receivable_installment_tags_tag_id_receivable_installment_i_idx" ON "receivable_installment_tags"("tag_id", "receivable_installment_id");

-- AddForeignKey
ALTER TABLE "payable_installment_tags" ADD CONSTRAINT "payable_installment_tags_payable_installment_id_fkey" FOREIGN KEY ("payable_installment_id") REFERENCES "payable_installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_installment_tags" ADD CONSTRAINT "payable_installment_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_installment_tags" ADD CONSTRAINT "receivable_installment_tags_receivable_installment_id_fkey" FOREIGN KEY ("receivable_installment_id") REFERENCES "receivable_installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_installment_tags" ADD CONSTRAINT "receivable_installment_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
