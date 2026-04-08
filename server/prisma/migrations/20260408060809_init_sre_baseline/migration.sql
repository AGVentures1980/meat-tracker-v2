/*
  Warnings:

  - A unique constraint covering the columns `[company_id,client_event_id]` on the table `InventoryRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,client_event_id]` on the table `PullToPrepEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,client_event_id]` on the table `ReceivingEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,client_event_id]` on the table `TrimRecordEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DeletionJobStatus" AS ENUM ('ANALYZED', 'EXECUTED', 'FAILED_HASH_MISMATCH', 'FAILED_EXECUTION', 'REJECTED');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "reason" TEXT,
ALTER COLUMN "location" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "BarcodeScanEvent" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "protein_name" TEXT,
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CorporateProteinSpec" ADD COLUMN     "max_yield_loss_percent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InventoryRecord" ADD COLUMN     "client_event_id" TEXT,
ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "ProcurementAIFeedback" ADD COLUMN     "max_yield_loss_percent" DOUBLE PRECISION DEFAULT 20.0,
ADD COLUMN     "target_cooking_yield_percent" DOUBLE PRECISION,
ADD COLUMN     "target_trim_yield_percent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PullToPrepEvent" ADD COLUMN     "client_event_id" TEXT,
ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "ReceivingEvent" ADD COLUMN     "client_event_id" TEXT,
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "invoice_id" TEXT,
ADD COLUMN     "invoiced_price_per_lb" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "TrimRecordEvent" ADD COLUMN     "client_event_id" TEXT,
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "quarantine_reason" TEXT,
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordHistory" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultFile" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "document_type" TEXT NOT NULL,
    "bucket_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "upload_status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploaded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "VaultFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAccessLog" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrQuarantineQueue" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "store_id" INTEGER NOT NULL,
    "invoice_number" TEXT,
    "invoice_date" TIMESTAMP(3),
    "supplier_id" TEXT,
    "raw_line_text" TEXT NOT NULL,
    "normalized_cut_name" TEXT,
    "contract_price_per_lb" DOUBLE PRECISION,
    "invoiced_price_per_lb" DOUBLE PRECISION,
    "variance_abs" DOUBLE PRECISION,
    "variance_pct" DOUBLE PRECISION,
    "ocr_confidence" DOUBLE PRECISION NOT NULL,
    "alert_status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrQuarantineQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDeletionJob" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_email" TEXT NOT NULL,
    "status" "DeletionJobStatus" NOT NULL DEFAULT 'ANALYZED',
    "dry_run_payload" JSONB NOT NULL,
    "dry_run_hash" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_at" TIMESTAMP(3),

    CONSTRAINT "TenantDeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE INDEX "PasswordHistory_user_id_idx" ON "PasswordHistory"("user_id");

-- CreateIndex
CREATE INDEX "VaultFile_company_id_store_id_idx" ON "VaultFile"("company_id", "store_id");

-- CreateIndex
CREATE INDEX "VaultFile_document_type_idx" ON "VaultFile"("document_type");

-- CreateIndex
CREATE INDEX "VaultFile_storage_key_idx" ON "VaultFile"("storage_key");

-- CreateIndex
CREATE INDEX "FileAccessLog_file_id_idx" ON "FileAccessLog"("file_id");

-- CreateIndex
CREATE INDEX "FileAccessLog_user_id_idx" ON "FileAccessLog"("user_id");

-- CreateIndex
CREATE INDEX "FileAccessLog_company_id_store_id_idx" ON "FileAccessLog"("company_id", "store_id");

-- CreateIndex
CREATE INDEX "TenantDeletionJob_company_id_idx" ON "TenantDeletionJob"("company_id");

-- CreateIndex
CREATE INDEX "TenantDeletionJob_status_idx" ON "TenantDeletionJob"("status");

-- CreateIndex
CREATE INDEX "AuditLog_company_id_created_at_idx" ON "AuditLog"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryRecord_company_id_client_event_id_key" ON "InventoryRecord"("company_id", "client_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "PullToPrepEvent_company_id_client_event_id_key" ON "PullToPrepEvent"("company_id", "client_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingEvent_company_id_client_event_id_key" ON "ReceivingEvent"("company_id", "client_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "TrimRecordEvent_company_id_client_event_id_key" ON "TrimRecordEvent"("company_id", "client_event_id");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordHistory" ADD CONSTRAINT "PasswordHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAccessLog" ADD CONSTRAINT "FileAccessLog_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "VaultFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAccessLog" ADD CONSTRAINT "FileAccessLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrQuarantineQueue" ADD CONSTRAINT "OcrQuarantineQueue_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
