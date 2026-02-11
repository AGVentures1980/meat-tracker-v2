/*
  Warnings:

  - A unique constraint covering the columns `[company_id,store_name]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE 'OCR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_trial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trial_expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL,
    "target_lbs_guest" DOUBLE PRECISION NOT NULL DEFAULT 1.76,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteLog" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "shift" TEXT NOT NULL,
    "input_by" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteCompliance" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "lunch_count" INTEGER NOT NULL DEFAULT 0,
    "dinner_count" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_by" TEXT,

    CONSTRAINT "WasteCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepLog" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "forecast" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySale" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "OrderSource" NOT NULL,
    "order_external_id" TEXT,
    "total_lbs" DOUBLE PRECISION NOT NULL,
    "guests" INTEGER NOT NULL,
    "protein_breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverySale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WasteLog_store_id_date_shift_key" ON "WasteLog"("store_id", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "WasteCompliance_store_id_week_start_key" ON "WasteCompliance"("store_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "PrepLog_store_id_date_key" ON "PrepLog"("store_id", "date");

-- CreateIndex
CREATE INDEX "DeliverySale_store_id_date_idx" ON "DeliverySale"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Store_company_id_store_name_key" ON "Store"("company_id", "store_name");

-- AddForeignKey
ALTER TABLE "WasteLog" ADD CONSTRAINT "WasteLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteCompliance" ADD CONSTRAINT "WasteCompliance_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepLog" ADD CONSTRAINT "PrepLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverySale" ADD CONSTRAINT "DeliverySale_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
