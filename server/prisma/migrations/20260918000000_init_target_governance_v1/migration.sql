-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OutletType" AS ENUM ('RESTAURANT', 'BAR', 'KITCHEN', 'EMPLOYEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CycleType" AS ENUM ('WEEKLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CycleStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OperationType" AS ENUM ('RODIZIO', 'ALACARTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('admin', 'manager', 'viewer', 'director', 'area_manager', 'partner', 'corporate_director', 'regional_director', 'property_manager', 'executive_chef', 'outlet_manager', 'kitchen_operator', 'read_only_viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OrderSource" AS ENUM ('OLO', 'UberEats', 'DoorDash', 'Manual', 'OCR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'PROPOSAL_SENT', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FileType" AS ENUM ('CSV', 'Image');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SenderType" AS ENUM ('USER', 'AI', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MeatSourceType" AS ENUM ('RODIZIO', 'DELIVERY', 'ALACARTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UsdaGrade" AS ENUM ('PRIME', 'CHOICE', 'SELECT', 'CAB', 'WAGYU', 'STANDARD', 'UNGRADED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DeletionJobStatus" AS ENUM ('ANALYZED', 'EXECUTED', 'FAILED_HASH_MISMATCH', 'FAILED_EXECUTION', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BoxStatus" AS ENUM ('RECEIVED', 'IN_COOLER', 'PULLED_TO_PREP', 'CONSUMED', 'WASTE', 'QUARANTINED', 'ADJUSTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BoxEvent" AS ENUM ('RECEIVE', 'PUT_AWAY', 'PULL_TO_PREP', 'PREP_FINISHED', 'CONSUME', 'MARK_WASTE', 'ADMIN_ADJUST', 'QUARANTINE_LOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TierLevel" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DocuSignStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'SIGNED', 'DECLINED', 'VOIDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "IntakeStatus" AS ENUM ('RECEIVED', 'NORMALIZED', 'VALIDATED', 'QUARANTINED', 'REJECTED', 'CANONICALIZED', 'QUEUED', 'PROCESSING', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ScopeLevel" AS ENUM ('GLOBAL', 'TENANT', 'STORE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "QuarantineCause" AS ENUM ('INVALID_SCOPE', 'PARSER_FAILURE', 'LOW_CONFIDENCE', 'DUPLICATE_INPUT', 'UNSUPPORTED_FORMAT', 'INVALID_PAYLOAD', 'INVALID_MIME', 'FILE_TOO_LARGE', 'OCR_FAILURE', 'NORMALIZATION_FAILURE', 'RULESET_FAILURE', 'MISSING_REQUIRED_FIELDS', 'MALWARE_DETECTED', 'CORRUPTED_FILE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RuleMatchType" AS ENUM ('GTIN', 'PRODUCT_CODE', 'PREFIX', 'REGEX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RuleStrength" AS ENUM ('STRONG', 'MEDIUM', 'WEAK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PoStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'DISPUTED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DeliveryStatus" AS ENUM ('PLANNED', 'IN_TRANSIT', 'ARRIVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'EXCEPTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupplierDocType" AS ENUM ('INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'ASN', 'DELIVERY_NOTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DocParsedStatus" AS ENUM ('CAPTURED', 'PARSED', 'VERIFIED', 'LINKED', 'DISPUTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "VarianceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BatchStatus" AS ENUM ('OPEN', 'CLOSED', 'RECONCILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "InputSourceType" AS ENUM ('PRIME_CUT', 'SCRAP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AllocationMethod" AS ENUM ('UNIT_BASED', 'FIXED_WEIGHT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DestinationChannel" AS ENUM ('SALAO', 'BAR', 'DELIVERY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SnapshotType" AS ENUM ('DAILY', 'WEEKLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DecisionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'FORWARDED', 'APPROVED', 'RESOLVED', 'DISMISSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PilotStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ROLLED_BACK', 'INACTIVE', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FeedbackCategory" AS ENUM ('UX_CONFUSION', 'DATA_QUALITY_ISSUE', 'OPERATIONAL_PROCESS_GAP', 'BUG', 'PERFORMANCE_ISSUE', 'METRIC_CONFIDENCE_ISSUE', 'ADOPTION_BARRIER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "StoreDataType" AS ENUM ('LIVE', 'DEMO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'enterprise',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annual_growth_rate" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "owner_id" TEXT,
    "api_key" TEXT,
    "baseline_loss_pct" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "baseline_overproduction_pct" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "baseline_ruptura_pct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "baseline_yield" DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    "billing_status" TEXT NOT NULL DEFAULT 'trialing',
    "billing_type" TEXT NOT NULL DEFAULT 'STRIPE_AUTO',
    "company_status" TEXT NOT NULL DEFAULT 'Pending',
    "contract_savings_fee_pct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "operationType" "OperationType" NOT NULL DEFAULT 'RODIZIO',
    "stores_licensed" INTEGER NOT NULL DEFAULT 1,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subdomain" TEXT,
    "theme_bg_url" TEXT,
    "theme_logo_url" TEXT,
    "theme_primary_color" TEXT,
    "contract_id" TEXT,
    "contract_signed_at" TIMESTAMP(3),
    "contract_status" "DocuSignStatus" NOT NULL DEFAULT 'PENDING',
    "contract_version" TEXT NOT NULL DEFAULT 'v1.0',
    "current_tier" "TierLevel" NOT NULL DEFAULT 'TIER_1',
    "grace_period_until" TIMESTAMP(3),
    "last_polled_at" TIMESTAMP(3),
    "onboarding_started_at" TIMESTAMP(3),
    "polling_attempts" INTEGER NOT NULL DEFAULT 0,
    "polling_expires_at" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrganizationProductEntitlement" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMP(3),
    "enabled_by" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProductEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CompanyProduct" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "is_villain" BOOLEAN NOT NULL DEFAULT false,
    "is_dinner_only" BOOLEAN NOT NULL DEFAULT false,
    "standard_target" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "include_in_delivery" BOOLEAN NOT NULL DEFAULT false,
    "protein_group" TEXT,
    "lbs_per_skewer" DOUBLE PRECISION,
    "required_usda_grade" "UsdaGrade",

    CONSTRAINT "CompanyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Store" (
    "id" SERIAL NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_cost_guest" DOUBLE PRECISION NOT NULL DEFAULT 9.94,
    "target_lbs_guest" DOUBLE PRECISION NOT NULL DEFAULT 1.76,
    "dinner_price" DOUBLE PRECISION NOT NULL DEFAULT 58.90,
    "is_lunch_enabled" BOOLEAN NOT NULL DEFAULT false,
    "lunch_price" DOUBLE PRECISION NOT NULL DEFAULT 29.90,
    "olo_sales_target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serves_lamb_chops_rodizio" BOOLEAN NOT NULL DEFAULT false,
    "active_template_id" TEXT,
    "annual_volume_lbs" INTEGER NOT NULL DEFAULT 180000,
    "area_manager_id" TEXT,
    "baseline_consumption_pax" DOUBLE PRECISION NOT NULL DEFAULT 1.72,
    "baseline_cost_per_lb" DOUBLE PRECISION NOT NULL DEFAULT 9.50,
    "baseline_forecast_accuracy" DOUBLE PRECISION NOT NULL DEFAULT 62.0,
    "baseline_loss_rate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "baseline_overproduction" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "baseline_trailing_pax" DOUBLE PRECISION NOT NULL DEFAULT 1.85,
    "baseline_yield_ribs" DOUBLE PRECISION NOT NULL DEFAULT 74.0,
    "baseline_yoy_pax" DOUBLE PRECISION NOT NULL DEFAULT 1.88,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "dinner_end_time" TEXT DEFAULT '22:00',
    "dinner_start_time" TEXT DEFAULT '15:00',
    "is_pilot" BOOLEAN NOT NULL DEFAULT false,
    "lunch_end_time" TEXT DEFAULT '15:00',
    "lunch_excluded_proteins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lunch_start_time" TEXT DEFAULT '11:00',
    "lunch_target_lbs_guest" DOUBLE PRECISION,
    "pilot_start_date" TIMESTAMP(3),
    "region" TEXT DEFAULT 'Global',
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "olo_target_lbs_order" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "target_patty_oz" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "activated_at" TIMESTAMP(3),
    "billing_active" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "data_type" "StoreDataType" NOT NULL DEFAULT 'DEMO',

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Outlet" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "outlet_type" "OutletType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "covers_per_day" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "target_lbs_per_guest" DOUBLE PRECISION,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreMeatTarget" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "protein" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "cost_target" DOUBLE PRECISION,

    CONSTRAINT "StoreMeatTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "force_change" BOOLEAN NOT NULL DEFAULT false,
    "last_password_change" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_expires_at" TIMESTAMP(3),
    "director_region" TEXT,
    "eula_accepted_at" TIMESTAMP(3),
    "first_name" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "last_name" TEXT,
    "position" TEXT,
    "company_id" TEXT,
    "token_version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "outletIds" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OwnerVaultMessage" (
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
CREATE TABLE IF NOT EXISTS "TrainingProgress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "order_external_id" TEXT,
    "source" "OrderSource" NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "raw_payload" JSONB,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "protein_type" TEXT NOT NULL,
    "lbs" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MeatUsage" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "protein" TEXT NOT NULL,
    "lbs_total" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "source_type" "MeatSourceType",
    "outlet_id" TEXT,

    CONSTRAINT "MeatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Upload" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "total_lbs" DOUBLE PRECISION NOT NULL,
    "extra_customers" INTEGER NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_guests" INTEGER NOT NULL DEFAULT 0,
    "dine_in_guests" INTEGER NOT NULL DEFAULT 0,
    "dinner_guests_micros" INTEGER NOT NULL DEFAULT 0,
    "lunch_guests_micros" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryRecord" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "client_event_id" TEXT,
    "company_id" TEXT,

    CONSTRAINT "InventoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost_total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InvoiceRecord" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_number" TEXT,
    "item_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price_per_lb" DOUBLE PRECISION NOT NULL,
    "cost_total" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Manual',
    "expected_weight_lb" DOUBLE PRECISION,
    "received_weight_lb" DOUBLE PRECISION,
    "weight_discrepancy_lb" DOUBLE PRECISION,
    "outlet_id" TEXT,

    CONSTRAINT "InvoiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL DEFAULT 'SYSTEM',
    "target_lbs_guest" DOUBLE PRECISION NOT NULL DEFAULT 1.76,
    "company_id" TEXT,
    "ip_address" TEXT,
    "reason" TEXT,
    "store_id" INTEGER,
    "outlet_id" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WasteLog" (
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
CREATE TABLE IF NOT EXISTS "WasteCompliance" (
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
CREATE TABLE IF NOT EXISTS "PrepLog" (
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
CREATE TABLE IF NOT EXISTS "DeliverySale" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "OrderSource" NOT NULL,
    "order_external_id" TEXT,
    "total_lbs" DOUBLE PRECISION NOT NULL,
    "guests" INTEGER NOT NULL,
    "protein_breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DeliverySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductAlias" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "protein" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SalesForecast" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "forecast_lunch" INTEGER NOT NULL DEFAULT 0,
    "forecast_dinner" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "forecast_olo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalesForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Prospect" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "potential_fit" DOUBLE PRECISION NOT NULL,
    "research_summary" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "contact_info" JSONB,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SysInvoice" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "billing_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "description" TEXT,
    "usage_stats" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SysInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SystemMetric" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Lead" (
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
CREATE TABLE IF NOT EXISTS "InventoryCycle" (
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
CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "protein_id" TEXT NOT NULL,
    "expected_lbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_lbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance_lbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deltaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "systemWeightLb" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FAQ" (
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
CREATE TABLE IF NOT EXISTS "SupportTicket" (
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
    "company_id" TEXT,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProcurementAIFeedback" (
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
    "max_yield_loss_percent" DOUBLE PRECISION DEFAULT 20.0,
    "target_cooking_yield_percent" DOUBLE PRECISION,
    "target_trim_yield_percent" DOUBLE PRECISION,

    CONSTRAINT "ProcurementAIFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Partner" (
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
CREATE TABLE IF NOT EXISTS "PartnerClient" (
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
CREATE TABLE IF NOT EXISTS "Proposal" (
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
CREATE TABLE IF NOT EXISTS "Payout" (
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
CREATE TABLE IF NOT EXISTS "ContractDocument" (
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
CREATE TABLE IF NOT EXISTS "PilotDailyAudit" (
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
CREATE TABLE IF NOT EXISTS "ForecastIntelligenceLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "reservation_forecast" INTEGER,
    "manager_adjusted_forecast" INTEGER,
    "ai_forecast" INTEGER,
    "actual_dine_in_guests" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastIntelligenceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OutletForecastLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "meal_period" TEXT NOT NULL,
    "reservation_forecast" INTEGER,
    "manager_forecast" INTEGER,
    "actual_guests" INTEGER,
    "lbs_consumed" DOUBLE PRECISION,
    "lbs_per_guest" DOUBLE PRECISION,
    "target_lbs_per_guest" DOUBLE PRECISION,
    "variance_pct" DOUBLE PRECISION,
    "submitted_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutletForecastLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLogArchive" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "store_id" INTEGER,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "reason" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "location" TEXT NOT NULL,
    "target_lbs_guest" DOUBLE PRECISION NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CorporateProteinSpec" (
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
    "max_yield_loss_percent" DOUBLE PRECISION,

    CONSTRAINT "CorporateProteinSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BarcodeScanEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "scanned_barcode" TEXT NOT NULL,
    "gtin" TEXT,
    "usda_grade" "UsdaGrade",
    "is_approved" BOOLEAN NOT NULL,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "protein_name" TEXT,
    "supplier" TEXT,
    "weight" DOUBLE PRECISION,

    CONSTRAINT "BarcodeScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BurgerInventoryPool" (
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
    "manager_declared_on_hand" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BurgerInventoryPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BarcodeFamily" (
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
CREATE TABLE IF NOT EXISTS "UnknownBarcodeLog" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "raw_barcode" TEXT NOT NULL,
    "context" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnknownBarcodeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReceivingEvent" (
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
    "client_event_id" TEXT,
    "company_id" TEXT,
    "invoice_id" TEXT,
    "invoiced_price_per_lb" DOUBLE PRECISION,
    "alternative_box_identifier" TEXT,
    "barcode_source_type" TEXT NOT NULL DEFAULT 'REAL',
    "excess_receipt_reason" TEXT,
    "financialStatus" TEXT,
    "matchStatus" TEXT,
    "original_barcode" TEXT,
    "override_flag" BOOLEAN NOT NULL DEFAULT false,
    "requires_supply_chain_review" BOOLEAN NOT NULL DEFAULT false,
    "shipment_id" TEXT,
    "supervisor_id" TEXT,
    "weightType" TEXT NOT NULL DEFAULT 'FIXED',

    CONSTRAINT "ReceivingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PullToPrepEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "scanned_barcode" TEXT NOT NULL,
    "gtin" TEXT,
    "weight" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_event_id" TEXT,
    "company_id" TEXT,
    "intended_use" TEXT NOT NULL DEFAULT 'RODIZIO',

    CONSTRAINT "PullToPrepEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrimRecordEvent" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "protein_name" TEXT,
    "input_weight" DOUBLE PRECISION NOT NULL,
    "trim_weight" DOUBLE PRECISION NOT NULL,
    "yield_pct" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_event_id" TEXT,
    "company_id" TEXT,
    "quarantine_reason" TEXT,
    "reviewed_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "sent_to" TEXT NOT NULL DEFAULT 'WASTE_BIN',

    CONSTRAINT "TrimRecordEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FinancialLeakageEvent" (
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
CREATE TABLE IF NOT EXISTS "AiYieldInsight" (
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
CREATE TABLE IF NOT EXISTS "SystemAlert" (
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
CREATE TABLE IF NOT EXISTS "IndustryBenchmark" (
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
CREATE TABLE IF NOT EXISTS "BarcodeDecisionLog" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordHistory" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VaultFile" (
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
CREATE TABLE IF NOT EXISTS "FileAccessLog" (
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
CREATE TABLE IF NOT EXISTS "OcrQuarantineQueue" (
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
CREATE TABLE IF NOT EXISTS "TenantDeletionJob" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "RawIntegrationPayload" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "trace_id" TEXT,
    "source_id" TEXT NOT NULL,
    "store_id" TEXT,
    "raw_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawIntegrationPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CanonicalEvent" (
    "id" TEXT NOT NULL,
    "payload_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "normalized_data" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanonicalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProteinBox" (
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
    "available_units" INTEGER,

    CONSTRAINT "ProteinBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BoxLifecycleEvent" (
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
CREATE TABLE IF NOT EXISTS "WeeklyReconciliationSnapshot" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "MigrationGuardAuditLog" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guard_version" TEXT NOT NULL,
    "boot_id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "migration_name" TEXT,
    "event" TEXT NOT NULL,
    "state_detected" TEXT,
    "decision" TEXT,
    "checksum_db" TEXT,
    "checksum_local" TEXT,
    "finished_at" TIMESTAMP(3),
    "rolled_back_at" TIMESTAMP(3),
    "reason" TEXT,
    "details" JSONB,

    CONSTRAINT "MigrationGuardAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "tier" "TierLevel" NOT NULL,
    "price_per_store" DOUBLE PRECISION NOT NULL,
    "platform_fee" DOUBLE PRECISION NOT NULL,
    "store_count" INTEGER NOT NULL DEFAULT 0,
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BillingPlan" (
    "id" TEXT NOT NULL,
    "tier" "TierLevel" NOT NULL,
    "price_per_store" DOUBLE PRECISION NOT NULL,
    "platform_fee" DOUBLE PRECISION NOT NULL,
    "min_store_commitment" INTEGER NOT NULL DEFAULT 1,
    "annual_discount_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoldenDatasetItem" (
    "id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "raw_input" TEXT NOT NULL,
    "expected_output" JSONB,
    "validation_notes" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "tenant_id" TEXT NOT NULL,
    "store_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "batch_id" TEXT,
    "fingerprint" TEXT NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'RECEIVED',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "canonical_input" TEXT NOT NULL,
    "canonicalizer_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "correlation_id" TEXT NOT NULL,
    "job_id" TEXT,
    "normalized_output" JSONB,
    "normalizer_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "parsed_output" JSONB,
    "parser_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "processed_at" TIMESTAMP(3),
    "quarantine_details" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "ruleset_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "scope_level" "ScopeLevel" NOT NULL,
    "validation_output" JSONB,
    "quarantine_cause" "QuarantineCause",

    CONSTRAINT "GoldenDatasetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntakeBatch" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntakeJob" (
    "id" TEXT NOT NULL,
    "dataset_item_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "worker_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntakeAudit" (
    "id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_resource" TEXT NOT NULL,
    "effective_scope" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "result_status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ValidationRun" (
    "id" TEXT NOT NULL,
    "executed_by" TEXT NOT NULL,
    "tenant_id" TEXT,
    "store_id" INTEGER,
    "source_type" TEXT,
    "total_cases_run" INTEGER NOT NULL,
    "failed_cases" INTEGER NOT NULL,
    "score_barcode_accuracy" DOUBLE PRECISION NOT NULL,
    "score_parsing_accuracy" DOUBLE PRECISION NOT NULL,
    "score_reconciliation" DOUBLE PRECISION NOT NULL,
    "score_leak_breaches" INTEGER NOT NULL,
    "score_duplicate_detection" DOUBLE PRECISION NOT NULL,
    "health_status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "audit_trail" JSONB,

    CONSTRAINT "ValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ValidationQuarantine" (
    "id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "tenant_id" TEXT,
    "store_id" INTEGER,
    "raw_payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_to" TEXT,

    CONSTRAINT "ValidationQuarantine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShadowModeCompare" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "v1_result" JSONB,
    "shadow_result" JSONB,
    "drift_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'REVIEW_NEEDED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShadowModeCompare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OutboxEvent" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FileObject" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "malware_scan_status" TEXT NOT NULL DEFAULT 'PENDING',
    "dataset_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RulesetVersion" (
    "id" TEXT NOT NULL,
    "version_tag" TEXT NOT NULL,
    "thresholds" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL DEFAULT 'SYSTEM',

    CONSTRAINT "RulesetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScoreDefinition" (
    "id" TEXT NOT NULL,
    "score_name" TEXT NOT NULL,
    "formula_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntelligenceSnapshot" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_id" INTEGER,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "op_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "store_trust_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ingestion_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lbs_guest_real" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lbs_guest_theo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lbs_guest_delta_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source_inputs_used" INTEGER NOT NULL DEFAULT 0,
    "ruleset_version" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "local_baseline_context" JSONB,

    CONSTRAINT "IntelligenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnomalyEvent" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_id" INTEGER,
    "anomaly_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "trigger_value" DOUBLE PRECISION NOT NULL,
    "baseline_value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_capped" BOOLEAN NOT NULL DEFAULT false,
    "demo_mode" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnomalyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RecommendationEvent" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "anomaly_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "store_id" INTEGER,
    "action_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "owner_role" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deadline_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReceivingRecognitionRule" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "protein_spec_id" TEXT NOT NULL,
    "gtin" TEXT,
    "normalized_product_code" TEXT,
    "raw_barcode_pattern" TEXT,
    "match_strength" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "ReceivingRecognitionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "store_id" INTEGER,
    "target_id" TEXT,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "store_id" INTEGER,

    CONSTRAINT "SupplierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierBarcodeRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "matchType" "RuleMatchType" NOT NULL,
    "gtin" TEXT,
    "normalizedProductCode" TEXT,
    "rawBarcodePattern" TEXT,
    "regex" TEXT,
    "matchStrength" "RuleStrength" NOT NULL,
    "minPrefixLength" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proteinSpecId" TEXT NOT NULL,

    CONSTRAINT "SupplierBarcodeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierCatalogItem" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierItemCode" TEXT NOT NULL,
    "gtin" TEXT,
    "supplierDescription" TEXT,
    "supplierPackType" TEXT,
    "expectedWeightRange" TEXT,
    "expectedUom" TEXT DEFAULT 'lb',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "linkedProteinSpecId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "supplierId" TEXT,
    "poNumber" TEXT NOT NULL,
    "status" "PoStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "supplierItemCode" TEXT,
    "productRefId" TEXT,
    "qtyExpected" INTEGER NOT NULL,
    "weightExpected" DOUBLE PRECISION,
    "packCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExpectedDelivery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "supplierId" TEXT,
    "asnNumber" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpectedDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExpectedDeliveryLine" (
    "id" TEXT NOT NULL,
    "expectedDeliveryId" TEXT NOT NULL,
    "supplierItemCode" TEXT,
    "qtyExpected" INTEGER NOT NULL,
    "weightExpected" DOUBLE PRECISION,

    CONSTRAINT "ExpectedDeliveryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "supplierId" TEXT,
    "documentType" "SupplierDocType" NOT NULL,
    "externalDocumentNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "sourceChannel" TEXT NOT NULL DEFAULT 'UPLOAD',
    "rawPayload" JSONB,
    "parsedStatus" "DocParsedStatus" NOT NULL DEFAULT 'CAPTURED',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierDocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "supplierItemCode" TEXT,
    "qty" INTEGER,
    "weight" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,

    CONSTRAINT "SupplierDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PosSalesFeed" (
    "id" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'TOAST',
    "transactionRef" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosSalesFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PosSalesLine" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "itemSold" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "modifiers" JSONB,
    "channel" TEXT NOT NULL DEFAULT 'DINE_IN',

    CONSTRAINT "PosSalesLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReconciliationEvent" (
    "id" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VarianceCase" (
    "id" TEXT NOT NULL,
    "reconciliationEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "VarianceSeverity" NOT NULL DEFAULT 'LOW',
    "sourceEntities" JSONB,
    "financialEstimate" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "requiredAction" TEXT,
    "assignedRole" TEXT,
    "auditTrail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarianceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierIntegritySnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "weakRuleRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reviewRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rejectRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "documentMismatchRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "expectedVsReceivedVariance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confidenceIndex" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "degradationTrend" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierIntegritySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProteinTransformationBatch" (
    "id" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productType" TEXT NOT NULL,
    "totalInputWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalOutputUnits" INTEGER NOT NULL DEFAULT 0,
    "totalOutputWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "yieldPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "BatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProteinTransformationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransformationInput" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceProteinBoxId" TEXT NOT NULL,
    "sourceType" "InputSourceType" NOT NULL,
    "weightUsed" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransformationInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransformationOutput" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "unitsProduced" INTEGER NOT NULL,
    "weightProduced" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransformationOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConsumptionLink" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "posSalesLineId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'POS',
    "unitsConsumed" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumptionLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConsumptionAllocationRule" (
    "id" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "allocationMethod" "AllocationMethod" NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitsPerSale" INTEGER NOT NULL DEFAULT 1,
    "unitsPerCase" INTEGER NOT NULL DEFAULT 10,
    "usesLotLevelWeight" BOOLEAN NOT NULL DEFAULT true,
    "fixedPortionWeightLbs" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumptionAllocationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProteinConsumptionAllocation" (
    "id" TEXT NOT NULL,
    "sourceProteinBoxId" TEXT,
    "sourceScanEventId" TEXT,
    "productCode" TEXT NOT NULL,
    "unitsConsumed" DOUBLE PRECISION NOT NULL,
    "lbsAllocated" DOUBLE PRECISION NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "destinationType" "DestinationChannel" NOT NULL,
    "posSalesLineId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProteinConsumptionAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExecutiveSnapshotLedger" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "storeId" INTEGER,
    "snapshotType" "SnapshotType" NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "integrityScore" DOUBLE PRECISION NOT NULL,
    "executiveRiskLevel" TEXT NOT NULL,
    "weeklyVarianceUSD" DOUBLE PRECISION NOT NULL,
    "lbsPerGuestDiningRoom" DOUBLE PRECISION,
    "actionPanelPayload" JSONB NOT NULL,
    "metricsVersion" TEXT NOT NULL,
    "scoreVersion" TEXT,
    "policyVersion" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "completenessStatus" TEXT NOT NULL DEFAULT 'COMPLETE',
    "missingSources" TEXT[],
    "reasonIfPartial" TEXT,

    CONSTRAINT "ExecutiveSnapshotLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExecutiveActionDecision" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "storeId" INTEGER,
    "actionCode" TEXT NOT NULL,
    "actionTitle" TEXT NOT NULL,
    "actionSeverity" TEXT NOT NULL,
    "financialImpactEstimateUSD" DOUBLE PRECISION NOT NULL,
    "sourceSnapshotId" TEXT,
    "sourceMetricVersion" TEXT NOT NULL,
    "sourceBusinessDate" TIMESTAMP(3),
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "decisionStatus" "DecisionStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionOutcome" TEXT,
    "assignedToUserId" TEXT,
    "createdBySystem" BOOLEAN NOT NULL DEFAULT true,
    "viewedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "forwardedAt" TIMESTAMP(3),
    "actedByUserId" TEXT,
    "actedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutiveActionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PilotConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "status" "PilotStatus" NOT NULL DEFAULT 'INACTIVE',
    "pilotStartDate" TIMESTAMP(3) NOT NULL,
    "pilotEndDate" TIMESTAMP(3),
    "enabledFeatures" TEXT[],
    "allowedRoles" TEXT[],
    "successThresholds" JSONB,
    "rollbackEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PilotConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PilotFeedback" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "actionDecisionId" TEXT,
    "feedbackCategory" "FeedbackCategory" NOT NULL,
    "severity" TEXT NOT NULL,
    "affectedScreen" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BarcodeCanonicalIdentity" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "identity_hash" TEXT NOT NULL,
    "base_gtin" TEXT,
    "supplier_prefix" TEXT,
    "source_integrity" TEXT NOT NULL DEFAULT 'WEAK',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "BarcodeCanonicalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierAliasMapping" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "canonical_hash" TEXT NOT NULL,
    "protein_spec_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "SupplierAliasMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RawBarcodeEvent" (
    "id" TEXT NOT NULL,
    "scanned_barcode" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "company_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "detected_symbology" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawBarcodeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ParsedBarcodeFacts" (
    "id" TEXT NOT NULL,
    "raw_barcode_event_id" TEXT NOT NULL,
    "gtin" TEXT,
    "item_reference" TEXT,
    "product_code" TEXT,
    "weight_lb" DOUBLE PRECISION,
    "lot" TEXT,
    "serial" TEXT,
    "production_date" TEXT,
    "parser_source" TEXT NOT NULL,
    "parser_confidence" DOUBLE PRECISION NOT NULL,
    "normalized_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsedBarcodeFacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CanonicalBarcodeIdentity" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "identity_hash" TEXT NOT NULL,
    "identity_basis" TEXT NOT NULL,
    "identity_input_type" TEXT NOT NULL,
    "stable_signature" TEXT NOT NULL,
    "supplier_context_id" TEXT,
    "source_integrity" TEXT NOT NULL DEFAULT 'WEAK',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "operational_family_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalBarcodeIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplierProductAlias" (
    "id" TEXT NOT NULL,
    "canonical_identity_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "alias_type" TEXT NOT NULL,
    "alias_value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProductAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OperationalFamily" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "family_code" TEXT NOT NULL,
    "family_name" TEXT NOT NULL,
    "protein_group" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FamilySpecBinding" (
    "id" TEXT NOT NULL,
    "operational_family_id" TEXT NOT NULL,
    "corporate_protein_spec_id" TEXT NOT NULL,
    "binding_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilySpecBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MappingReviewQueue" (
    "id" TEXT NOT NULL,
    "raw_barcode" TEXT NOT NULL,
    "parsed_facts_id" TEXT,
    "canonical_identity_candidate_id" TEXT,
    "suggested_family_id" TEXT,
    "suggested_spec_id" TEXT,
    "reason_code" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution_notes" TEXT,
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "store_id" INTEGER,
    "company_id" TEXT,

    CONSTRAINT "MappingReviewQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IdentityResolutionAudit" (
    "id" TEXT NOT NULL,
    "raw_barcode" TEXT NOT NULL,
    "parsed_facts_id" TEXT,
    "canonical_identity_id" TEXT,
    "alias_match_id" TEXT,
    "operational_family_id" TEXT,
    "corporate_spec_id" TEXT,
    "decision_path" TEXT NOT NULL,
    "confidence_level" DOUBLE PRECISION NOT NULL,
    "governance_status" TEXT NOT NULL,
    "trace_payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityResolutionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InboundShipment" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "store_id" INTEGER NOT NULL,
    "supplier_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "total_boxes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InboundLineUnit" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "canonical_family_id" TEXT,
    "supply_chain_approved_id" TEXT,
    "expectedWeightLb" DOUBLE PRECISION NOT NULL,
    "weightType" TEXT NOT NULL DEFAULT 'FIXED',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "reviewReason" TEXT,
    "matched_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundLineUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProducedInventoryItem" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "source_batch_id" TEXT NOT NULL,
    "source_box_id" TEXT,
    "product_name" TEXT NOT NULL,
    "weight_lb" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProducedInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PublicLocationRegistry" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "official_location_name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "public_operating_status" TEXT NOT NULL,
    "property_type" TEXT,
    "official_source_url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciliation_status" TEXT NOT NULL,
    "matched_brasa_store_id" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicLocationRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrganizationTargetVersion" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "target_cost_pax" DOUBLE PRECISION NOT NULL,
    "target_lbs_pax" DOUBLE PRECISION NOT NULL,
    "fiscal_year" INTEGER NOT NULL DEFAULT 2027,
    "period_type" TEXT NOT NULL DEFAULT 'YEAR',
    "period_identifier" TEXT NOT NULL DEFAULT 'FY2027',
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationTargetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreTargetAllocation" (
    "id" TEXT NOT NULL,
    "target_version_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "tier_name" TEXT,
    "allocated_lbs_pax" DOUBLE PRECISION NOT NULL,
    "allocated_cost_pax" DOUBLE PRECISION NOT NULL,
    "projected_covers" INTEGER NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreTargetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TargetScenarioSimulation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "scenario_name" TEXT NOT NULL,
    "proposed_cost_pax" DOUBLE PRECISION NOT NULL,
    "proposed_lbs_pax" DOUBLE PRECISION NOT NULL,
    "simulated_by" TEXT NOT NULL,
    "simulated_payload" JSONB NOT NULL,
    "is_promoted" BOOLEAN NOT NULL DEFAULT false,
    "promoted_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetScenarioSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Company_api_key_key" ON "Company"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Company_stripe_customer_id_key" ON "Company"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Company_stripe_subscription_id_key" ON "Company"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Company_subdomain_key" ON "Company"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Company_contract_id_key" ON "Company"("contract_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrganizationProductEntitlement_company_id_status_idx" ON "OrganizationProductEntitlement"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationProductEntitlement_company_id_product_code_key" ON "OrganizationProductEntitlement"("company_id", "product_code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyProduct_company_id_name_key" ON "CompanyProduct"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Store_company_id_store_name_key" ON "Store"("company_id", "store_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Outlet_company_id_store_id_idx" ON "Outlet"("company_id", "store_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Outlet_store_id_outlet_type_idx" ON "Outlet"("store_id", "outlet_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Outlet_store_id_slug_key" ON "Outlet"("store_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StoreTemplate_company_id_name_key" ON "StoreTemplate"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StoreMeatTarget_store_id_protein_key" ON "StoreMeatTarget"("store_id", "protein");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingProgress_user_id_module_id_key" ON "TrainingProgress"("user_id", "module_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_store_id_order_date_idx" ON "Order"("store_id", "order_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MeatUsage_store_id_source_type_date_idx" ON "MeatUsage"("store_id", "source_type", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MeatUsage_store_id_protein_date_key" ON "MeatUsage"("store_id", "protein", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Report_store_id_month_key" ON "Report"("store_id", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryRecord_store_id_date_idx" ON "InventoryRecord"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryRecord_company_id_client_event_id_key" ON "InventoryRecord"("company_id", "client_event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseRecord_store_id_date_idx" ON "PurchaseRecord"("store_id", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InvoiceRecord_store_id_date_idx" ON "InvoiceRecord"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_company_id_created_at_idx" ON "AuditLog"("company_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_store_id_created_at_idx" ON "AuditLog"("store_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_store_id_outlet_id_created_at_idx" ON "AuditLog"("store_id", "outlet_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WasteLog_store_id_date_shift_key" ON "WasteLog"("store_id", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WasteCompliance_store_id_week_start_key" ON "WasteCompliance"("store_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PrepLog_store_id_date_key" ON "PrepLog"("store_id", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeliverySale_store_id_date_idx" ON "DeliverySale"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductAlias_store_id_alias_key" ON "ProductAlias"("store_id", "alias");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SalesForecast_store_id_week_start_key" ON "SalesForecast"("store_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SystemMetric_key_key" ON "SystemMetric"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryCycle_store_id_cycle_type_start_date_key" ON "InventoryCycle"("store_id", "cycle_type", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_cycle_id_protein_id_key" ON "InventoryItem"("cycle_id", "protein_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_store_id_status_idx" ON "SupportTicket"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementAIFeedback_store_id_date_protein_key" ON "ProcurementAIFeedback"("store_id", "date", "protein");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Partner_user_id_key" ON "Partner"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerClient_partner_id_company_id_key" ON "PartnerClient"("partner_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PilotDailyAudit_store_id_audit_date_key" ON "PilotDailyAudit"("store_id", "audit_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForecastIntelligenceLog_store_id_business_date_idx" ON "ForecastIntelligenceLog"("store_id", "business_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForecastIntelligenceLog_company_id_business_date_idx" ON "ForecastIntelligenceLog"("company_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ForecastIntelligenceLog_store_id_business_date_key" ON "ForecastIntelligenceLog"("store_id", "business_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutletForecastLog_company_id_store_id_business_date_idx" ON "OutletForecastLog"("company_id", "store_id", "business_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutletForecastLog_outlet_id_business_date_idx" ON "OutletForecastLog"("outlet_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OutletForecastLog_outlet_id_business_date_meal_period_key" ON "OutletForecastLog"("outlet_id", "business_date", "meal_period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLogArchive_company_id_created_at_idx" ON "AuditLogArchive"("company_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLogArchive_store_id_created_at_idx" ON "AuditLogArchive"("store_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BurgerInventoryPool_store_id_date_key" ON "BurgerInventoryPool"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BarcodeFamily_family_code_key" ON "BarcodeFamily"("family_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BarcodeFamily_family_code_is_active_idx" ON "BarcodeFamily"("family_code", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ReceivingEvent_company_id_client_event_id_key" ON "ReceivingEvent"("company_id", "client_event_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ReceivingEvent_scanned_barcode_shipment_id_key" ON "ReceivingEvent"("scanned_barcode", "shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PullToPrepEvent_company_id_client_event_id_key" ON "PullToPrepEvent"("company_id", "client_event_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrimRecordEvent_company_id_client_event_id_key" ON "TrimRecordEvent"("company_id", "client_event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BarcodeDecisionLog_store_id_context_status_idx" ON "BarcodeDecisionLog"("store_id", "context", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordHistory_user_id_idx" ON "PasswordHistory"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VaultFile_company_id_store_id_idx" ON "VaultFile"("company_id", "store_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VaultFile_document_type_idx" ON "VaultFile"("document_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VaultFile_storage_key_idx" ON "VaultFile"("storage_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FileAccessLog_file_id_idx" ON "FileAccessLog"("file_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FileAccessLog_user_id_idx" ON "FileAccessLog"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FileAccessLog_company_id_store_id_idx" ON "FileAccessLog"("company_id", "store_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TenantDeletionJob_company_id_idx" ON "TenantDeletionJob"("company_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TenantDeletionJob_status_idx" ON "TenantDeletionJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RawIntegrationPayload_idempotency_key_key" ON "RawIntegrationPayload"("idempotency_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RawIntegrationPayload_source_id_status_idx" ON "RawIntegrationPayload"("source_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RawIntegrationPayload_trace_id_idx" ON "RawIntegrationPayload"("trace_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CanonicalEvent_payload_id_key" ON "CanonicalEvent"("payload_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProteinBox_store_id_status_idx" ON "ProteinBox"("store_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProteinBox_gtin_lot_code_idx" ON "ProteinBox"("gtin", "lot_code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProteinBox_store_id_barcode_business_date_key" ON "ProteinBox"("store_id", "barcode", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripe_subscription_id_key" ON "Subscription"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BillingPlan_tier_key" ON "BillingPlan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoldenDatasetItem_fingerprint_key" ON "GoldenDatasetItem"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoldenDatasetItem_job_id_key" ON "GoldenDatasetItem"("job_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoldenDatasetItem_tenant_id_status_created_at_idx" ON "GoldenDatasetItem"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoldenDatasetItem_correlation_id_idx" ON "GoldenDatasetItem"("correlation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeBatch_tenant_id_idx" ON "IntakeBatch"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeJob_dataset_item_id_key" ON "IntakeJob"("dataset_item_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeJob_dataset_item_id_idx" ON "IntakeJob"("dataset_item_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeAudit_correlation_id_key" ON "IntakeAudit"("correlation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntakeAudit_effective_scope_action_idx" ON "IntakeAudit"("effective_scope", "action");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OutboxEvent_idempotency_key_key" ON "OutboxEvent"("idempotency_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_locked_at_created_at_idx" ON "OutboxEvent"("status", "locked_at", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutboxEvent_idempotency_key_idx" ON "OutboxEvent"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FileObject_storage_key_key" ON "FileObject"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FileObject_checksum_key" ON "FileObject"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FileObject_dataset_item_id_key" ON "FileObject"("dataset_item_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FileObject_tenant_id_checksum_idx" ON "FileObject"("tenant_id", "checksum");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RulesetVersion_version_tag_key" ON "RulesetVersion"("version_tag");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ScoreDefinition_score_name_key" ON "ScoreDefinition"("score_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntelligenceSnapshot_tenant_id_generated_at_idx" ON "IntelligenceSnapshot"("tenant_id", "generated_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntelligenceSnapshot_tenant_id_store_id_period_start_period_key" ON "IntelligenceSnapshot"("tenant_id", "store_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnomalyEvent_tenant_id_severity_idx" ON "AnomalyEvent"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RecommendationEvent_tenant_id_owner_role_status_idx" ON "RecommendationEvent"("tenant_id", "owner_role", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierProfile_companyId_store_id_idx" ON "SupplierProfile"("companyId", "store_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierProfile_companyId_idx" ON "SupplierProfile"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierBarcodeRule_companyId_supplierId_idx" ON "SupplierBarcodeRule"("companyId", "supplierId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierCatalogItem_supplierId_supplierItemCode_idx" ON "SupplierCatalogItem"("supplierId", "supplierItemCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_companyId_storeId_idx" ON "PurchaseOrder"("companyId", "storeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpectedDelivery_companyId_storeId_idx" ON "ExpectedDelivery"("companyId", "storeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpectedDelivery_asnNumber_idx" ON "ExpectedDelivery"("asnNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierDocument_storeId_idx" ON "SupplierDocument"("storeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierDocument_externalDocumentNumber_idx" ON "SupplierDocument"("externalDocumentNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosSalesFeed_storeId_businessDate_idx" ON "PosSalesFeed"("storeId", "businessDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReconciliationEvent_storeId_businessDate_idx" ON "ReconciliationEvent"("storeId", "businessDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierIntegritySnapshot_companyId_supplierId_periodEnd_idx" ON "SupplierIntegritySnapshot"("companyId", "supplierId", "periodEnd");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProteinTransformationBatch_storeId_status_idx" ON "ProteinTransformationBatch"("storeId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransformationInput_batchId_idx" ON "TransformationInput"("batchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransformationInput_sourceProteinBoxId_idx" ON "TransformationInput"("sourceProteinBoxId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransformationOutput_batchId_idx" ON "TransformationOutput"("batchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsumptionLink_batchId_idx" ON "ConsumptionLink"("batchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsumptionLink_posSalesLineId_idx" ON "ConsumptionLink"("posSalesLineId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsumptionAllocationRule_storeId_productCode_idx" ON "ConsumptionAllocationRule"("storeId", "productCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProteinConsumptionAllocation_sourceProteinBoxId_idx" ON "ProteinConsumptionAllocation"("sourceProteinBoxId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProteinConsumptionAllocation_posSalesLineId_idx" ON "ProteinConsumptionAllocation"("posSalesLineId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExecutiveSnapshotLedger_companyId_storeId_snapshotType_busi_key" ON "ExecutiveSnapshotLedger"("companyId", "storeId", "snapshotType", "businessDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExecutiveActionDecision_storeId_decisionStatus_createdAt_idx" ON "ExecutiveActionDecision"("storeId", "decisionStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PilotConfiguration_storeId_key" ON "PilotConfiguration"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BarcodeCanonicalIdentity_identity_hash_key" ON "BarcodeCanonicalIdentity"("identity_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BarcodeCanonicalIdentity_company_id_idx" ON "BarcodeCanonicalIdentity"("company_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BarcodeCanonicalIdentity_identity_hash_idx" ON "BarcodeCanonicalIdentity"("identity_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BarcodeCanonicalIdentity_base_gtin_idx" ON "BarcodeCanonicalIdentity"("base_gtin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierAliasMapping_company_id_idx" ON "SupplierAliasMapping"("company_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierAliasMapping_canonical_hash_idx" ON "SupplierAliasMapping"("canonical_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierAliasMapping_protein_spec_id_idx" ON "SupplierAliasMapping"("protein_spec_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierAliasMapping_company_id_canonical_hash_protein_spec_key" ON "SupplierAliasMapping"("company_id", "canonical_hash", "protein_spec_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ParsedBarcodeFacts_raw_barcode_event_id_key" ON "ParsedBarcodeFacts"("raw_barcode_event_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CanonicalBarcodeIdentity_identity_hash_key" ON "CanonicalBarcodeIdentity"("identity_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CanonicalBarcodeIdentity_company_id_idx" ON "CanonicalBarcodeIdentity"("company_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CanonicalBarcodeIdentity_identity_hash_idx" ON "CanonicalBarcodeIdentity"("identity_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CanonicalBarcodeIdentity_stable_signature_idx" ON "CanonicalBarcodeIdentity"("stable_signature");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CanonicalBarcodeIdentity_operational_family_id_idx" ON "CanonicalBarcodeIdentity"("operational_family_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplierProductAlias_canonical_identity_id_idx" ON "SupplierProductAlias"("canonical_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OperationalFamily_company_id_family_code_key" ON "OperationalFamily"("company_id", "family_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FamilySpecBinding_operational_family_id_idx" ON "FamilySpecBinding"("operational_family_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FamilySpecBinding_corporate_protein_spec_id_idx" ON "FamilySpecBinding"("corporate_protein_spec_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FamilySpecBinding_operational_family_id_corporate_protein_s_key" ON "FamilySpecBinding"("operational_family_id", "corporate_protein_spec_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MappingReviewQueue_company_id_idx" ON "MappingReviewQueue"("company_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MappingReviewQueue_review_status_idx" ON "MappingReviewQueue"("review_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IdentityResolutionAudit_raw_barcode_idx" ON "IdentityResolutionAudit"("raw_barcode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IdentityResolutionAudit_canonical_identity_id_idx" ON "IdentityResolutionAudit"("canonical_identity_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InboundShipment_store_id_supplier_id_status_idx" ON "InboundShipment"("store_id", "supplier_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InboundShipment_store_id_invoice_number_key" ON "InboundShipment"("store_id", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InboundLineUnit_matched_event_id_key" ON "InboundLineUnit"("matched_event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InboundLineUnit_shipment_id_status_idx" ON "InboundLineUnit"("shipment_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProducedInventoryItem_store_id_status_idx" ON "ProducedInventoryItem"("store_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProducedInventoryItem_source_batch_id_idx" ON "ProducedInventoryItem"("source_batch_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublicLocationRegistry_company_id_reconciliation_status_idx" ON "PublicLocationRegistry"("company_id", "reconciliation_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublicLocationRegistry_company_id_public_operating_status_idx" ON "PublicLocationRegistry"("company_id", "public_operating_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrganizationTargetVersion_company_id_status_effective_from_idx" ON "OrganizationTargetVersion"("company_id", "status", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationTargetVersion_company_id_version_key" ON "OrganizationTargetVersion"("company_id", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StoreTargetAllocation_store_id_idx" ON "StoreTargetAllocation"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StoreTargetAllocation_target_version_id_store_id_key" ON "StoreTargetAllocation"("target_version_id", "store_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TargetScenarioSimulation_company_id_is_promoted_idx" ON "TargetScenarioSimulation"("company_id", "is_promoted");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "OrganizationProductEntitlement" ADD CONSTRAINT "OrganizationProductEntitlement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Store" ADD CONSTRAINT "Store_active_template_id_fkey" FOREIGN KEY ("active_template_id") REFERENCES "StoreTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Store" ADD CONSTRAINT "Store_area_manager_id_fkey" FOREIGN KEY ("area_manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Store" ADD CONSTRAINT "Store_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "StoreTemplate" ADD CONSTRAINT "StoreTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "StoreMeatTarget" ADD CONSTRAINT "StoreMeatTarget_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "OwnerVaultMessage" ADD CONSTRAINT "OwnerVaultMessage_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "MeatUsage" ADD CONSTRAINT "MeatUsage_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Upload" ADD CONSTRAINT "Upload_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Report" ADD CONSTRAINT "Report_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryRecord" ADD CONSTRAINT "InventoryRecord_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WasteLog" ADD CONSTRAINT "WasteLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WasteCompliance" ADD CONSTRAINT "WasteCompliance_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PrepLog" ADD CONSTRAINT "PrepLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "DeliverySale" ADD CONSTRAINT "DeliverySale_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SalesForecast" ADD CONSTRAINT "SalesForecast_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SysInvoice" ADD CONSTRAINT "SysInvoice_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryCycle" ADD CONSTRAINT "InventoryCycle_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "InventoryCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_protein_id_fkey" FOREIGN KEY ("protein_id") REFERENCES "CompanyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ProcurementAIFeedback" ADD CONSTRAINT "ProcurementAIFeedback_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Partner" ADD CONSTRAINT "Partner_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PartnerClient" ADD CONSTRAINT "PartnerClient_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PartnerClient" ADD CONSTRAINT "PartnerClient_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Payout" ADD CONSTRAINT "Payout_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PilotDailyAudit" ADD CONSTRAINT "PilotDailyAudit_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ForecastIntelligenceLog" ADD CONSTRAINT "ForecastIntelligenceLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ForecastIntelligenceLog" ADD CONSTRAINT "ForecastIntelligenceLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "CorporateProteinSpec" ADD CONSTRAINT "CorporateProteinSpec_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BarcodeScanEvent" ADD CONSTRAINT "BarcodeScanEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BurgerInventoryPool" ADD CONSTRAINT "BurgerInventoryPool_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "UnknownBarcodeLog" ADD CONSTRAINT "UnknownBarcodeLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ReceivingEvent" ADD CONSTRAINT "ReceivingEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PullToPrepEvent" ADD CONSTRAINT "PullToPrepEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "TrimRecordEvent" ADD CONSTRAINT "TrimRecordEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FinancialLeakageEvent" ADD CONSTRAINT "FinancialLeakageEvent_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AiYieldInsight" ADD CONSTRAINT "AiYieldInsight_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SystemAlert" ADD CONSTRAINT "SystemAlert_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BarcodeDecisionLog" ADD CONSTRAINT "BarcodeDecisionLog_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PasswordHistory" ADD CONSTRAINT "PasswordHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FileAccessLog" ADD CONSTRAINT "FileAccessLog_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "VaultFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FileAccessLog" ADD CONSTRAINT "FileAccessLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "OcrQuarantineQueue" ADD CONSTRAINT "OcrQuarantineQueue_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BoxLifecycleEvent" ADD CONSTRAINT "BoxLifecycleEvent_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "ProteinBox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AnomalyEvent" ADD CONSTRAINT "AnomalyEvent_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "IntelligenceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "AnomalyEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "IntelligenceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ReceivingRecognitionRule" ADD CONSTRAINT "ReceivingRecognitionRule_protein_spec_id_fkey" FOREIGN KEY ("protein_spec_id") REFERENCES "CorporateProteinSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierBarcodeRule" ADD CONSTRAINT "SupplierBarcodeRule_proteinSpecId_fkey" FOREIGN KEY ("proteinSpecId") REFERENCES "CorporateProteinSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierBarcodeRule" ADD CONSTRAINT "SupplierBarcodeRule_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "SupplierProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierCatalogItem" ADD CONSTRAINT "SupplierCatalogItem_linkedProteinSpecId_fkey" FOREIGN KEY ("linkedProteinSpecId") REFERENCES "CorporateProteinSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierCatalogItem" ADD CONSTRAINT "SupplierCatalogItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "SupplierProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ExpectedDeliveryLine" ADD CONSTRAINT "ExpectedDeliveryLine_expectedDeliveryId_fkey" FOREIGN KEY ("expectedDeliveryId") REFERENCES "ExpectedDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierDocumentLine" ADD CONSTRAINT "SupplierDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SupplierDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PosSalesLine" ADD CONSTRAINT "PosSalesLine_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "PosSalesFeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "VarianceCase" ADD CONSTRAINT "VarianceCase_reconciliationEventId_fkey" FOREIGN KEY ("reconciliationEventId") REFERENCES "ReconciliationEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "TransformationInput" ADD CONSTRAINT "TransformationInput_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProteinTransformationBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "TransformationInput" ADD CONSTRAINT "TransformationInput_sourceProteinBoxId_fkey" FOREIGN KEY ("sourceProteinBoxId") REFERENCES "ProteinBox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "TransformationOutput" ADD CONSTRAINT "TransformationOutput_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProteinTransformationBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ConsumptionLink" ADD CONSTRAINT "ConsumptionLink_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProteinTransformationBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ConsumptionLink" ADD CONSTRAINT "ConsumptionLink_posSalesLineId_fkey" FOREIGN KEY ("posSalesLineId") REFERENCES "PosSalesLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ProteinConsumptionAllocation" ADD CONSTRAINT "ProteinConsumptionAllocation_posSalesLineId_fkey" FOREIGN KEY ("posSalesLineId") REFERENCES "PosSalesLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ProteinConsumptionAllocation" ADD CONSTRAINT "ProteinConsumptionAllocation_sourceProteinBoxId_fkey" FOREIGN KEY ("sourceProteinBoxId") REFERENCES "ProteinBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierAliasMapping" ADD CONSTRAINT "SupplierAliasMapping_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierAliasMapping" ADD CONSTRAINT "SupplierAliasMapping_protein_spec_id_fkey" FOREIGN KEY ("protein_spec_id") REFERENCES "CorporateProteinSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ParsedBarcodeFacts" ADD CONSTRAINT "ParsedBarcodeFacts_raw_barcode_event_id_fkey" FOREIGN KEY ("raw_barcode_event_id") REFERENCES "RawBarcodeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "CanonicalBarcodeIdentity" ADD CONSTRAINT "CanonicalBarcodeIdentity_operational_family_id_fkey" FOREIGN KEY ("operational_family_id") REFERENCES "OperationalFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SupplierProductAlias" ADD CONSTRAINT "SupplierProductAlias_canonical_identity_id_fkey" FOREIGN KEY ("canonical_identity_id") REFERENCES "CanonicalBarcodeIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FamilySpecBinding" ADD CONSTRAINT "FamilySpecBinding_corporate_protein_spec_id_fkey" FOREIGN KEY ("corporate_protein_spec_id") REFERENCES "CorporateProteinSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FamilySpecBinding" ADD CONSTRAINT "FamilySpecBinding_operational_family_id_fkey" FOREIGN KEY ("operational_family_id") REFERENCES "OperationalFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "IdentityResolutionAudit" ADD CONSTRAINT "IdentityResolutionAudit_canonical_identity_id_fkey" FOREIGN KEY ("canonical_identity_id") REFERENCES "CanonicalBarcodeIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InboundShipment" ADD CONSTRAINT "InboundShipment_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InboundLineUnit" ADD CONSTRAINT "InboundLineUnit_matched_event_id_fkey" FOREIGN KEY ("matched_event_id") REFERENCES "ReceivingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InboundLineUnit" ADD CONSTRAINT "InboundLineUnit_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "InboundShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PublicLocationRegistry" ADD CONSTRAINT "PublicLocationRegistry_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "OrganizationTargetVersion" ADD CONSTRAINT "OrganizationTargetVersion_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "StoreTargetAllocation" ADD CONSTRAINT "StoreTargetAllocation_target_version_id_fkey" FOREIGN KEY ("target_version_id") REFERENCES "OrganizationTargetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "StoreTargetAllocation" ADD CONSTRAINT "StoreTargetAllocation_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "TargetScenarioSimulation" ADD CONSTRAINT "TargetScenarioSimulation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

