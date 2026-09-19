-- CreateTable
CREATE TABLE "CompanyProductPreparation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "parent_product_id" TEXT NOT NULL,
    "preparation_name" TEXT NOT NULL,
    "normalized_preparation_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProductPreparation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyProductPreparation_company_id_idx" ON "CompanyProductPreparation"("company_id");

-- CreateIndex
CREATE INDEX "CompanyProductPreparation_parent_product_id_idx" ON "CompanyProductPreparation"("parent_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProductPreparation_company_id_parent_product_id_nor_key" ON "CompanyProductPreparation"("company_id", "parent_product_id", "normalized_preparation_name");

-- AddForeignKey
ALTER TABLE "CompanyProductPreparation" ADD CONSTRAINT "CompanyProductPreparation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProductPreparation" ADD CONSTRAINT "CompanyProductPreparation_parent_product_id_fkey" FOREIGN KEY ("parent_product_id") REFERENCES "CompanyProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
