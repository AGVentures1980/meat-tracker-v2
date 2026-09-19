-- CreateTable ProvisioningRun
CREATE TABLE IF NOT EXISTS "ProvisioningRun" (
    "id" TEXT NOT NULL,
    "manifest_id" TEXT NOT NULL,
    "manifest_version" INTEGER NOT NULL DEFAULT 1,
    "manifest_hash" TEXT NOT NULL,
    "company_id" TEXT,
    "company_subdomain" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "summary_json" JSONB NOT NULL,
    "error_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProvisioningRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "ProvisioningRun_company_subdomain_mode_idx" ON "ProvisioningRun"("company_subdomain", "mode");
CREATE INDEX IF NOT EXISTS "ProvisioningRun_manifest_hash_idx" ON "ProvisioningRun"("manifest_hash");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ProvisioningRun" ADD CONSTRAINT "ProvisioningRun_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
