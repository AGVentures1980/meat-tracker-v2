/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_customer_id]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[api_key]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('RODIZIO', 'ALACARTE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'PROPOSAL_SENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'AI', 'ADMIN');

-- CreateEnum
CREATE TYPE "UsdaGrade" AS ENUM ('PRIME', 'CHOICE', 'SELECT', 'CAB', 'WAGYU', 'STANDARD', 'UNGRADED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'area_manager';
ALTER TYPE "Role" ADD VALUE 'partner';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "api_key" TEXT,
ADD COLUMN     "baseline_loss_pct" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
ADD COLUMN     "baseline_overproduction_pct" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
ADD COLUMN     "baseline_ruptura_pct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "baseline_yield" DOUBLE PRECISION NOT NULL DEFAULT 65.0,
ADD COLUMN     "billing_status" TEXT NOT NULL DEFAULT 'trialing',
ADD COLUMN     "billing_type" TEXT NOT NULL DEFAULT 'STRIPE_AUTO',
ADD COLUMN     "company_status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN     "contract_savings_fee_pct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "operationType" "OperationType" NOT NULL DEFAULT 'RODIZIO',
ADD COLUMN     "stores_licensed" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subdomain" TEXT,
ADD COLUMN     "theme_bg_url" TEXT,
ADD COLUMN     "theme_logo_url" TEXT,
ADD COLUMN     "theme_primary_color" TEXT;

-- AlterTable
ALTER TABLE "CompanyProduct" ADD COLUMN     "lbs_per_skewer" DOUBLE PRECISION,
ADD COLUMN     "required_usda_grade" "UsdaGrade";

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "annual_volume_lbs" INTEGER NOT NULL DEFAULT 180000,
ADD COLUMN     "area_manager_id" TEXT,
ADD COLUMN     "baseline_consumption_pax" DOUBLE PRECISION NOT NULL DEFAULT 1.72,
ADD COLUMN     "baseline_cost_per_lb" DOUBLE PRECISION NOT NULL DEFAULT 9.50,
ADD COLUMN     "baseline_forecast_accuracy" DOUBLE PRECISION NOT NULL DEFAULT 62.0,
ADD COLUMN     "baseline_loss_rate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
ADD COLUMN     "baseline_overproduction" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
ADD COLUMN     "baseline_trailing_pax" DOUBLE PRECISION NOT NULL DEFAULT 1.85,
ADD COLUMN     "baseline_yield_ribs" DOUBLE PRECISION NOT NULL DEFAULT 74.0,
ADD COLUMN     "baseline_yoy_pax" DOUBLE PRECISION NOT NULL DEFAULT 1.88,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'USA',
ADD COLUMN     "dinner_end_time" TEXT DEFAULT '22:00',
ADD COLUMN     "dinner_start_time" TEXT DEFAULT '15:00',
ADD COLUMN     "is_pilot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lunch_end_time" TEXT DEFAULT '15:00',
ADD COLUMN     "lunch_excluded_proteins" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lunch_start_time" TEXT DEFAULT '11:00',
ADD COLUMN     "lunch_target_lbs_guest" DOUBLE PRECISION,
ADD COLUMN     "pilot_start_date" TIMESTAMP(3),
ADD COLUMN     "region" TEXT DEFAULT 'Global',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "director_region" TEXT,
ADD COLUMN     "eula_accepted_at" TIMESTAMP(3),
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "is_primary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "position" TEXT;

-- CreateTable
CREATE TABLE "OwnerVaultMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "sender" TEXT NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "company_id" TEXT NOT NULL DEFAULT 'tdb-main',

    CONSTRAINT "OwnerVaultMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "store_count" INTEGER DEFAULT 1,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCycle" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "cycle_type" "CycleType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "InventoryCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "protein_id" TEXT NOT NULL,
    "expected_lbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_lbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance_lbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "frequency_count" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'General',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "is_escalated" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "rating_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementAIFeedback" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "protein" TEXT NOT NULL,
    "manager_prep_lbs" DOUBLE PRECISION NOT NULL,
    "ai_predicted_lbs" DOUBLE PRECISION NOT NULL,
    "chosen_winner" TEXT NOT NULL,
    "custom_correct_lbs" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_predicted_skewers" DOUBLE PRECISION,
    "custom_correct_skewers" DOUBLE PRECISION,
    "manager_prep_skewers" DOUBLE PRECISION,

    CONSTRAINT "ProcurementAIFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "legal_entity_type" TEXT NOT NULL DEFAULT 'Individual',
    "tax_id" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "paypal_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "agreement_ip" TEXT,
    "agreement_signed_at" TIMESTAMP(3),
    "training_completed_at" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerClient" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    "setup_fee_share" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "language" TEXT NOT NULL DEFAULT 'English',
    "store_count" INTEGER NOT NULL DEFAULT 1,
    "setup_fee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "monthly_fee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "agv_review_notes" TEXT,
    "signed_at" TIMESTAMP(3),
    "signer_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL DEFAULT 'SetupFee',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reference_month" DATE,
    "paid_at" TIMESTAMP(3),
    "paypal_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT NOT NULL,
    "contract_type" TEXT NOT NULL DEFAULT 'pilot',
    "implementation_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_saas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performance_share" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locations_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "api_envelope_id" TEXT,
    "contract_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotDailyAudit" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "audit_date" DATE NOT NULL,
    "day_number" INTEGER NOT NULL,
    "daily_score" DOUBLE PRECISION NOT NULL,
    "yield_savings_usd" DOUBLE PRECISION NOT NULL,
    "meat_rotation_insight" TEXT NOT NULL,
    "ai_executive_summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotDailyAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateProteinSpec" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "protein_name" TEXT NOT NULL,
    "approved_brand" TEXT NOT NULL,
    "supplier" TEXT,
    "approved_item_code" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_weight_min" DOUBLE PRECISION,
    "expected_weight_max" DOUBLE PRECISION,
    "expected_yield_pct" DOUBLE PRECISION,
    "expected_trim_loss_pct" DOUBLE PRECISION,
    "cost_per_lb" DOUBLE PRECISION,
    "allow_exception_receiving" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CorporateProteinSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarcodeScanEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "scanned_barcode" TEXT NOT NULL,
    "gtin" TEXT,
    "usda_grade" "UsdaGrade",
    "is_approved" BOOLEAN NOT NULL,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarcodeScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BurgerInventoryPool" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "total_lean_lbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_fat_waste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "theoretical_patties" INTEGER NOT NULL DEFAULT 0,
    "pos_patties_sold" INTEGER NOT NULL DEFAULT 0,
    "fraud_alert_qty" INTEGER NOT NULL DEFAULT 0,
    "is_fraud_flagged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BurgerInventoryPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarcodeFamily" (
    "id" TEXT NOT NULL,
    "family_code" TEXT NOT NULL,
    "family_name" TEXT NOT NULL,
    "symbology" TEXT NOT NULL,
    "barcode_type" TEXT NOT NULL DEFAULT 'GS1',
    "prefix_patterns" TEXT[],
    "parsing_strategy" TEXT NOT NULL DEFAULT 'generic',
    "unit_default" TEXT NOT NULL DEFAULT 'LB',
    "confidence_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "regex_pattern" TEXT,
    "length_min" INTEGER,
    "length_max" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnknownBarcodeLog" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "raw_barcode" TEXT NOT NULL,
    "context" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnknownBarcodeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivingEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "scanned_barcode" TEXT NOT NULL,
    "gtin" TEXT,
    "product_code" TEXT,
    "weight" DOUBLE PRECISION,
    "supplier" TEXT,
    "status" TEXT NOT NULL,
    "alert_severity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullToPrepEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "scanned_barcode" TEXT NOT NULL,
    "gtin" TEXT,
    "weight" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PullToPrepEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrimRecordEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "protein_name" TEXT,
    "input_weight" DOUBLE PRECISION NOT NULL,
    "trim_weight" DOUBLE PRECISION NOT NULL,
    "yield_pct" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrimRecordEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLeakageEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cut_name" TEXT NOT NULL,
    "supplier" TEXT,
    "lost_lbs" DOUBLE PRECISION NOT NULL,
    "cost_per_lb" DOUBLE PRECISION NOT NULL,
    "estimated_loss_usd" DOUBLE PRECISION NOT NULL,
    "source_of_loss" TEXT,
    "baseline_reference" TEXT,
    "classification" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLeakageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiYieldInsight" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "recommended_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiYieldInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "raw_data" JSONB,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryBenchmark" (
    "id" TEXT NOT NULL,
    "cut" TEXT NOT NULL,
    "yield_min" DOUBLE PRECISION NOT NULL,
    "yield_max" DOUBLE PRECISION NOT NULL,
    "trim_loss_min" DOUBLE PRECISION NOT NULL,
    "trim_loss_max" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "active_flag" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndustryBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarcodeDecisionLog" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "raw_barcode" TEXT NOT NULL,
    "cleaned_barcode" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT 'RECEIVING',
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "reason_code" TEXT,
    "attempted_parsers" TEXT[],
    "scores" DOUBLE PRECISION[],
    "selected_parser" TEXT NOT NULL,
    "runner_up_parser" TEXT NOT NULL DEFAULT 'NONE',
    "confidence_gap" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarcodeDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCycle_store_id_cycle_type_start_date_key" ON "InventoryCycle"("store_id", "cycle_type", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_cycle_id_protein_id_key" ON "InventoryItem"("cycle_id", "protein_id");

-- CreateIndex
CREATE INDEX "SupportTicket_store_id_status_idx" ON "SupportTicket"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementAIFeedback_store_id_date_protein_key" ON "ProcurementAIFeedback"("store_id", "date", "protein");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_user_id_key" ON "Partner"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerClient_partner_id_company_id_key" ON "PartnerClient"("partner_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "PilotDailyAudit_store_id_audit_date_key" ON "PilotDailyAudit"("store_id", "audit_date");

-- CreateIndex
CREATE UNIQUE INDEX "BurgerInventoryPool_store_id_date_key" ON "BurgerInventoryPool"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeFamily_family_code_key" ON "BarcodeFamily"("family_code");

-- CreateIndex
CREATE INDEX "BarcodeFamily_family_code_is_active_idx" ON "BarcodeFamily"("family_code", "is_active");

-- CreateIndex
CREATE INDEX "BarcodeDecisionLog_store_id_context_status_idx" ON "BarcodeDecisionLog"("store_id", "context", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Company_subdomain_key" ON "Company"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripe_customer_id_key" ON "Company"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripe_subscription_id_key" ON "Company"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_api_key_key" ON "Company"("api_key");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_area_manager_id_fkey" FOREIGN KEY ("area_manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerVaultMessage" ADD CONSTRAINT "OwnerVaultMessage_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycle" ADD CONSTRAINT "InventoryCycle_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "InventoryCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_protein_id_fkey" FOREIGN KEY ("protein_id") REFERENCES "CompanyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementAIFeedback" ADD CONSTRAINT "ProcurementAIFeedback_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerClient" ADD CONSTRAINT "PartnerClient_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerClient" ADD CONSTRAINT "PartnerClient_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotDailyAudit" ADD CONSTRAINT "PilotDailyAudit_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProteinSpec" ADD CONSTRAINT "CorporateProteinSpec_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeScanEvent" ADD CONSTRAINT "BarcodeScanEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurgerInventoryPool" ADD CONSTRAINT "BurgerInventoryPool_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnknownBarcodeLog" ADD CONSTRAINT "UnknownBarcodeLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingEvent" ADD CONSTRAINT "ReceivingEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullToPrepEvent" ADD CONSTRAINT "PullToPrepEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrimRecordEvent" ADD CONSTRAINT "TrimRecordEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLeakageEvent" ADD CONSTRAINT "FinancialLeakageEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiYieldInsight" ADD CONSTRAINT "AiYieldInsight_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAlert" ADD CONSTRAINT "SystemAlert_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeDecisionLog" ADD CONSTRAINT "BarcodeDecisionLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
