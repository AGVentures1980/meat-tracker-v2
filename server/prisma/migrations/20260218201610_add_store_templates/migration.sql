-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "active_template_id" TEXT;

-- CreateTable
CREATE TABLE "StoreTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreTemplate_company_id_name_key" ON "StoreTemplate"("company_id", "name");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_active_template_id_fkey" FOREIGN KEY ("active_template_id") REFERENCES "StoreTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTemplate" ADD CONSTRAINT "StoreTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
