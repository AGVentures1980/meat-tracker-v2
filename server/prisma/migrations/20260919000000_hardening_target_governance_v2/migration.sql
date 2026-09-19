-- Add capabilities to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Drop old unique constraint on OrganizationTargetVersion if exists
ALTER TABLE "OrganizationTargetVersion" DROP CONSTRAINT IF EXISTS "OrganizationTargetVersion_company_id_version_key";

-- Add period-scoped unique constraint on OrganizationTargetVersion
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationTargetVersion_company_id_period_type_period_identifier_version_key" 
ON "OrganizationTargetVersion"("company_id", "period_type", "period_identifier", "version");

-- Alter StoreTargetAllocation: make projected_covers nullable and add forecast_source
ALTER TABLE "StoreTargetAllocation" ALTER COLUMN "projected_covers" DROP DEFAULT;
ALTER TABLE "StoreTargetAllocation" ALTER COLUMN "projected_covers" DROP NOT NULL;
ALTER TABLE "StoreTargetAllocation" ADD COLUMN IF NOT EXISTS "forecast_source" TEXT;

-- Create OrganizationTargetMetric table
CREATE TABLE IF NOT EXISTS "OrganizationTargetMetric" (
    "id" TEXT NOT NULL,
    "target_version_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationTargetMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationTargetMetric_target_version_id_metric_type_key" 
ON "OrganizationTargetMetric"("target_version_id", "metric_type");

CREATE INDEX IF NOT EXISTS "OrganizationTargetMetric_target_version_id_idx" 
ON "OrganizationTargetMetric"("target_version_id");

ALTER TABLE "OrganizationTargetMetric" ADD CONSTRAINT "OrganizationTargetMetric_target_version_id_fkey" 
FOREIGN KEY ("target_version_id") REFERENCES "OrganizationTargetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PreparationTarget table
CREATE TABLE IF NOT EXISTS "PreparationTarget" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "parent_protein" TEXT NOT NULL,
    "subproduct_name" TEXT NOT NULL,
    "target_quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'lb',
    "target_date" DATE NOT NULL,
    "planned_parent_quantity" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'AUTHORIZED_MANAGER',
    "ai_recommended_qty" DOUBLE PRECISION,
    "actual_prepared_qty" DOUBLE PRECISION,
    "created_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PreparationTarget_store_id_subproduct_name_target_date_key" 
ON "PreparationTarget"("store_id", "subproduct_name", "target_date");

CREATE INDEX IF NOT EXISTS "PreparationTarget_company_id_store_id_target_date_idx" 
ON "PreparationTarget"("company_id", "store_id", "target_date");

CREATE INDEX IF NOT EXISTS "PreparationTarget_parent_protein_target_date_idx" 
ON "PreparationTarget"("parent_protein", "target_date");

ALTER TABLE "PreparationTarget" ADD CONSTRAINT "PreparationTarget_store_id_fkey" 
FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
