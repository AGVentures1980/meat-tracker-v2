-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('RECEIVED', 'IN_COOLER', 'PULLED_TO_PREP', 'CONSUMED', 'WASTE', 'QUARANTINED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "BoxEvent" AS ENUM ('RECEIVE', 'PUT_AWAY', 'PULL_TO_PREP', 'PREP_FINISHED', 'CONSUME', 'MARK_WASTE', 'ADMIN_ADJUST', 'QUARANTINE_LOCKED');

-- CreateTable
CREATE TABLE "ProteinBox" (
    "id" TEXT NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,
    "gtin" TEXT,
    "lot_code" TEXT,
    "product_name" TEXT NOT NULL,
    "vendor" TEXT,
    "received_weight_lb" DOUBLE PRECISION NOT NULL,
    "available_weight_lb" DOUBLE PRECISION NOT NULL,
    "status" "BoxStatus" NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by" TEXT NOT NULL,
    "source_receiving_event" TEXT,
    "business_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProteinBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoxLifecycleEvent" (
    "id" TEXT NOT NULL,
    "box_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "event_type" "BoxEvent" NOT NULL,
    "previous_status" "BoxStatus" NOT NULL,
    "new_status" "BoxStatus" NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight_variance" DOUBLE PRECISION,
    "reason" TEXT,

    CONSTRAINT "BoxLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReconciliationSnapshot" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" TIMESTAMP(3) NOT NULL,
    "scanned_boxes" TEXT[],
    "missing_boxes" TEXT[],
    "total_variance_lb" DOUBLE PRECISION NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReconciliationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProteinBox_store_id_status_idx" ON "ProteinBox"("store_id", "status");

-- CreateIndex
CREATE INDEX "ProteinBox_gtin_lot_code_idx" ON "ProteinBox"("gtin", "lot_code");

-- CreateIndex
CREATE UNIQUE INDEX "ProteinBox_store_id_barcode_business_date_key" ON "ProteinBox"("store_id", "barcode", "business_date");

-- AddForeignKey
ALTER TABLE "BoxLifecycleEvent" ADD CONSTRAINT "BoxLifecycleEvent_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "ProteinBox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
