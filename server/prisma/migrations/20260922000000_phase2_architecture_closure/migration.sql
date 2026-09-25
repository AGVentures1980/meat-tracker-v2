-- ============================================================
-- BRASA MEAT INTELLIGENCE™ - OFFICIAL MIGRATION DDL (POSTGRESQL 17)
-- MIGRATION IDENTIFIER: 20260922000000_phase2_architecture_closure
-- TARGET DATABASE OBJECTS: 97 OBJECTS (STAGES 1-5)
-- AUTHORIZED BY: Alexandre
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- STAGE 1: EXTENSIONS & ENUMS
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE "OperationalLifecycleState" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ScopeType" AS ENUM ('COMPANY', 'BRAND', 'PROPERTY', 'LOCATION', 'OUTLET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- STAGE 2: TARGET TABLES & COLUMNS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Brand" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_brand" PRIMARY KEY ("id"),
  CONSTRAINT "uq_brand_id_company" UNIQUE ("company_id", "id"),
  CONSTRAINT "uq_brand_company_code" UNIQUE ("company_id", "code"),
  CONSTRAINT "chk_sentinel_nil_brand" CHECK ("id" <> '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE TABLE IF NOT EXISTS "Property" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "classification_id" UUID,
  "lifecycle_state" "OperationalLifecycleState" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_property" PRIMARY KEY ("id"),
  CONSTRAINT "uq_property_id_company" UNIQUE ("company_id", "id"),
  CONSTRAINT "uq_property_company_code" UNIQUE ("company_id", "code")
);

CREATE TABLE IF NOT EXISTS "Location" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "property_id" UUID,
  "brand_id" UUID,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip_code" TEXT,
  "country" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "classification_id" UUID,
  "lifecycle_state" "OperationalLifecycleState" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_location" PRIMARY KEY ("id"),
  CONSTRAINT "uq_location_id_company" UNIQUE ("company_id", "id"),
  CONSTRAINT "uq_location_company_code" UNIQUE ("company_id", "code")
);

CREATE TABLE IF NOT EXISTS "Scope" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "scope_type" "ScopeType" NOT NULL,
  "brand_id" UUID,
  "property_id" UUID,
  "location_id" UUID,
  "outlet_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_scope" PRIMARY KEY ("id"),
  CONSTRAINT "uq_scope_id_company" UNIQUE ("company_id", "id"),
  CONSTRAINT "uq_scope_identity" UNIQUE ("company_id", "scope_type", "brand_id", "property_id", "location_id", "outlet_id")
);

CREATE TABLE IF NOT EXISTS "NodeClassification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_node_classification" PRIMARY KEY ("id"),
  CONSTRAINT "chk_node_classification_state" CHECK (
    (is_system = true AND company_id IS NULL) OR (is_system = false AND company_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS "CapabilityDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_capability_definition" PRIMARY KEY ("id"),
  CONSTRAINT "uq_capability_definition_code" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "CapabilityAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "scope_id" UUID NOT NULL,
  "capability_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_capability_assignment" PRIMARY KEY ("id"),
  CONSTRAINT "uq_capability_assignment" UNIQUE ("company_id", "scope_id", "capability_id")
);

CREATE TABLE IF NOT EXISTS "RuleDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_rule_definition" PRIMARY KEY ("id"),
  CONSTRAINT "uq_rule_definition_code" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "RuleAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "scope_id" UUID NOT NULL,
  "rule_code" TEXT NOT NULL,
  "product_id" UUID,
  "brand_id" UUID,
  "supplier_id" TEXT,
  "channel" TEXT,
  "effective_from" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "effective_until" TIMESTAMPTZ,
  "configuration" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_rule_assignment" PRIMARY KEY ("id"),
  CONSTRAINT "chk_sentinel_channel" CHECK (channel <> '__GLOBAL__'),
  CONSTRAINT "chk_rule_assignment_effective_range" CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE TABLE IF NOT EXISTS "UserScope" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "scope_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pk_user_scope" PRIMARY KEY ("id"),
  CONSTRAINT "uq_user_scope" UNIQUE ("user_id", "scope_id")
);

-- Alter Outlet for tenant-composite binding
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "location_id" UUID;
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "brand_id" UUID;
ALTER TABLE "Outlet" ADD CONSTRAINT "uq_outlet_id_company" UNIQUE ("company_id", "id");

-- Alter Company & Supplier Profile Check Constraints
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "chk_sentinel_nil_product" CHECK (id <> '00000000-0000-0000-0000-000000000000'::uuid);
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "uq_company_product_id_company" UNIQUE ("company_id", "id");

ALTER TABLE "SupplierProfile" ADD CONSTRAINT "chk_sentinel_nil_supplier" CHECK (id <> '00000000-0000-0000-0000-000000000000');
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "uq_supplier_profile_id_company" UNIQUE ("companyId", "id");

-- ------------------------------------------------------------
-- STAGE 3: COMPOSITE TENANT FOREIGN KEYS & INDEXES
-- ------------------------------------------------------------
-- Partial Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "uq_scope_company_single" ON "Scope" (company_id) WHERE scope_type = 'COMPANY';
CREATE UNIQUE INDEX IF NOT EXISTS "uq_node_class_system" ON "NodeClassification" (code) WHERE company_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_node_class_tenant" ON "NodeClassification" (company_id, code) WHERE company_id IS NOT NULL;

-- CHECK Constraints
ALTER TABLE "Scope" ADD CONSTRAINT "chk_scope_xor" CHECK (
  (scope_type = 'COMPANY' AND brand_id IS NULL AND property_id IS NULL AND location_id IS NULL AND outlet_id IS NULL) OR
  (scope_type = 'BRAND' AND brand_id IS NOT NULL AND property_id IS NULL AND location_id IS NULL AND outlet_id IS NULL) OR
  (scope_type = 'PROPERTY' AND property_id IS NOT NULL AND brand_id IS NULL AND location_id IS NULL AND outlet_id IS NULL) OR
  (scope_type = 'LOCATION' AND location_id IS NOT NULL AND brand_id IS NULL AND property_id IS NULL AND outlet_id IS NULL) OR
  (scope_type = 'OUTLET' AND outlet_id IS NOT NULL AND brand_id IS NULL AND property_id IS NULL AND location_id IS NULL)
);

-- Foreign Keys (Composite Tenant Anchoring)
ALTER TABLE "Location" ADD CONSTRAINT "fk_location_property_composite" FOREIGN KEY ("company_id", "property_id") REFERENCES "Property" ("company_id", "id") ON DELETE RESTRICT;
ALTER TABLE "Location" ADD CONSTRAINT "fk_location_brand_composite" FOREIGN KEY ("company_id", "brand_id") REFERENCES "Brand" ("company_id", "id") ON DELETE RESTRICT;

ALTER TABLE "Outlet" ADD CONSTRAINT "fk_outlet_location_composite" FOREIGN KEY ("company_id", "location_id") REFERENCES "Location" ("company_id", "id") ON DELETE RESTRICT;
ALTER TABLE "Outlet" ADD CONSTRAINT "fk_outlet_brand_composite" FOREIGN KEY ("company_id", "brand_id") REFERENCES "Brand" ("company_id", "id") ON DELETE RESTRICT;

ALTER TABLE "Scope" ADD CONSTRAINT "fk_scope_brand_composite" FOREIGN KEY ("company_id", "brand_id") REFERENCES "Brand" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "Scope" ADD CONSTRAINT "fk_scope_property_composite" FOREIGN KEY ("company_id", "property_id") REFERENCES "Property" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "Scope" ADD CONSTRAINT "fk_scope_location_composite" FOREIGN KEY ("company_id", "location_id") REFERENCES "Location" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "Scope" ADD CONSTRAINT "fk_scope_outlet_composite" FOREIGN KEY ("company_id", "outlet_id") REFERENCES "Outlet" ("company_id", "id") ON DELETE CASCADE;

ALTER TABLE "CapabilityAssignment" ADD CONSTRAINT "fk_capability_assignment_scope_composite" FOREIGN KEY ("company_id", "scope_id") REFERENCES "Scope" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "CapabilityAssignment" ADD CONSTRAINT "fk_capability_assignment_capability" FOREIGN KEY ("capability_id") REFERENCES "CapabilityDefinition" ("id") ON DELETE RESTRICT;

ALTER TABLE "RuleAssignment" ADD CONSTRAINT "fk_rule_assignment_scope_composite" FOREIGN KEY ("company_id", "scope_id") REFERENCES "Scope" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "RuleAssignment" ADD CONSTRAINT "fk_rule_assignment_rule_definition" FOREIGN KEY ("rule_code") REFERENCES "RuleDefinition" ("code") ON DELETE RESTRICT;
ALTER TABLE "RuleAssignment" ADD CONSTRAINT "fk_rule_assignment_product_composite" FOREIGN KEY ("company_id", "product_id") REFERENCES "CompanyProduct" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "RuleAssignment" ADD CONSTRAINT "fk_rule_assignment_brand_composite" FOREIGN KEY ("company_id", "brand_id") REFERENCES "Brand" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "RuleAssignment" ADD CONSTRAINT "fk_rule_assignment_supplier_composite" FOREIGN KEY ("company_id", "supplier_id") REFERENCES "SupplierProfile" ("companyId", "id") ON DELETE CASCADE;

ALTER TABLE "UserScope" ADD CONSTRAINT "fk_user_scope_scope_composite" FOREIGN KEY ("company_id", "scope_id") REFERENCES "Scope" ("company_id", "id") ON DELETE CASCADE;
ALTER TABLE "UserScope" ADD CONSTRAINT "fk_user_scope_user" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE;

-- ------------------------------------------------------------
-- STAGE 5: TRIGGER FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_node_classification_shadow() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM "NodeClassification" WHERE company_id IS NULL AND code = NEW.code) THEN
      RAISE EXCEPTION 'Tenant classification code % shadows system classification code', NEW.code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_node_classification_shadow BEFORE INSERT OR UPDATE OF code, company_id ON "NodeClassification" FOR EACH ROW EXECUTE FUNCTION fn_check_node_classification_shadow();

CREATE OR REPLACE FUNCTION fn_check_node_classification_isolation() RETURNS TRIGGER AS $$
DECLARE v_class_company_id UUID; v_is_system BOOLEAN;
BEGIN
  IF NEW.classification_id IS NULL THEN RETURN NEW; END IF;
  SELECT company_id, is_system INTO v_class_company_id, v_is_system FROM "NodeClassification" WHERE id = NEW.classification_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NodeClassification % not found', NEW.classification_id; END IF;
  IF (v_is_system = TRUE AND v_class_company_id IS NULL) OR (v_is_system = FALSE AND v_class_company_id = NEW.company_id) THEN
    RETURN NEW;
  ELSE RAISE EXCEPTION 'Cross-tenant classification reference blocked'; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_property_classification_iso BEFORE INSERT OR UPDATE OF company_id, classification_id ON "Property" FOR EACH ROW EXECUTE FUNCTION fn_check_node_classification_isolation();
CREATE TRIGGER trg_location_classification_iso BEFORE INSERT OR UPDATE OF company_id, classification_id ON "Location" FOR EACH ROW EXECUTE FUNCTION fn_check_node_classification_isolation();

CREATE OR REPLACE FUNCTION fn_check_node_classification_parent_protect() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.company_id IS NOT DISTINCT FROM NEW.company_id AND OLD.code = NEW.code THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM "Property" WHERE classification_id = OLD.id) OR EXISTS (SELECT 1 FROM "Location" WHERE classification_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot modify or delete NodeClassification % referenced by active structural nodes', OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_node_classification_parent_protect BEFORE UPDATE OR DELETE ON "NodeClassification" FOR EACH ROW EXECUTE FUNCTION fn_check_node_classification_parent_protect();

CREATE OR REPLACE FUNCTION fn_check_rule_definition_code_immutability() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code <> OLD.code THEN RAISE EXCEPTION 'RuleDefinition.code is immutable after creation.'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rule_definition_code_immut BEFORE UPDATE OF code ON "RuleDefinition" FOR EACH ROW EXECUTE FUNCTION fn_check_rule_definition_code_immutability();

CREATE OR REPLACE FUNCTION fn_check_user_scope_isolation() RETURNS TRIGGER AS $$
DECLARE v_user_company_id TEXT; v_user_role TEXT;
BEGIN
  SELECT company_id, role INTO v_user_company_id, v_user_role FROM "User" WHERE id = NEW.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User % not found', NEW.user_id; END IF;
  IF v_user_company_id IS NOT NULL THEN
    IF v_user_company_id <> NEW.company_id::text THEN RAISE EXCEPTION 'Cross-tenant UserScope violation'; END IF;
  ELSE
    IF v_user_role <> 'admin' THEN RAISE EXCEPTION 'Privilege escalation blocked for non-global null-company user'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_scope_tenant_iso BEFORE INSERT OR UPDATE OF company_id, user_id ON "UserScope" FOR EACH ROW EXECUTE FUNCTION fn_check_user_scope_isolation();

CREATE OR REPLACE FUNCTION fn_check_user_parent_protect() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.company_id IS NOT DISTINCT FROM NEW.company_id AND OLD.role = NEW.role THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM "UserScope" WHERE user_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot change company_id or role for User % with active UserScope assignments', OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_parent_protect BEFORE UPDATE OR DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION fn_check_user_parent_protect();

COMMIT;

-- ------------------------------------------------------------
-- STAGE 4: MAINTENANCE WINDOW EXCLUDE CONSTRAINT CREATION
-- ------------------------------------------------------------
SET LOCAL lock_timeout = '5s';

ALTER TABLE "RuleAssignment" ADD CONSTRAINT "excl_rule_assignment_temporal" EXCLUDE USING gist (
  company_id WITH =, scope_id WITH =, rule_code WITH =,
  COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
  COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
  COALESCE(supplier_id, '00000000-0000-0000-0000-000000000000') WITH =,
  COALESCE(channel, '__GLOBAL__') WITH =,
  tstzrange(effective_from, COALESCE(effective_until, 'infinity'::timestamptz), '[)') WITH &&
);
