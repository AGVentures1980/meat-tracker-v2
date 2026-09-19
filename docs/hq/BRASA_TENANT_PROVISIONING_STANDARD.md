# BRASA TENANT PROVISIONING STANDARD & ENGINE v1
## Authoritative Technical Specification — Declarative Multi-Tenant Provisioning Architecture

---

### 1. Architectural Scope & Purpose
The **BRASA Tenant Provisioning Standard & Engine v1** establishes a standardized, declarative, idempotent, and auditable multi-tenant provisioning framework for BRASA Meat Intelligence™.

It replaces ad-hoc seeder scripts (`seed_customer_x.ts`) with a single declarative manifest format (`TenantManifest`, `manifest_version: 1`) and a two-phase execution engine (`TenantProvisioner`):
- **Phase 1: Dry Run / Plan (`dryRun`)**: Evaluates manifest against database, validates taxonomy, detects collisions, and outputs structured diff report with **ZERO database mutations**.
- **Phase 2: Apply (`apply`)**: Re-checks collision boundaries, executes transactional batch writes, logs audit trail (`AuditService`), and validates post-provisioning health.

The provisioning engine consumes **BRASA Core Lock v1** architecture (`Company`, `Store`, `User`, `CompanyProduct`, `ProductAlias`, `StoreTemplate`/`Tier`, `StoreMeatTarget`, `OrganizationTargetVersion`, `OrganizationTargetMetric`, `StoreTargetAllocation`, `PreparationTarget`, `TargetScenarioSimulation`, `PublicLocationRegistry`, `RBAC`, `AuditService`, `scopedPrisma`).

---

### 2. Tenant Manifest Schema (`TenantManifest`)
Manifest format is declarative JSON/YAML (`manifest_version: 1`):

```json
{
  "manifest_id": "example-steakhouse-v1",
  "manifest_version": 1,
  "company": {
    "canonical_name": "Example Steakhouse Group",
    "display_name": "Example Steakhouse Group",
    "subdomain": "example-steakhouse",
    "concept_type": "RODIZIO",
    "timezone_default": "America/New_York",
    "country": "USA",
    "status": "Active",
    "branding": {
      "theme_primary_color": "#8B0000",
      "theme_logo_url": "https://example-steakhouse.com/logo.png"
    },
    "entitlements": ["BRASA_CORE", "BRASA_PULSE", "YIELD_INTELLIGENCE"],
    "pilot_config": {
      "is_pilot": true,
      "pilot_start_date": "2027-01-15"
    }
  },
  "locations": [
    {
      "canonical_key": "ex-nyc-01",
      "store_name": "Example NYC Midtown",
      "store_code": "EX-001",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "timezone": "America/New_York",
      "status": "ACTIVE",
      "is_pilot": true,
      "dinner_price": 64.90,
      "lunch_price": 34.90,
      "is_lunch_enabled": true
    }
  ],
  "products": [
    {
      "canonical_name": "Picanha",
      "category": "Prime Cuts",
      "protein_group": "BEEF",
      "is_dinner_only": false
    }
  ],
  "preparations": [
    {
      "parent_protein_name": "Picanha",
      "subproduct_name": "Garlic Picanha",
      "is_independently_purchased": false
    }
  ],
  "aliases": [
    {
      "alias_name": "Top Sirloin",
      "canonical_protein_name": "Picanha"
    }
  ],
  "users": [
    {
      "email": "exec@examplesteakhouse.com",
      "role": "owner",
      "first_name": "Executive",
      "last_name": "Owner",
      "position": "CEO",
      "is_primary": true,
      "capabilities": ["CORPORATE_TARGET_APPROVE", "CORPORATE_TARGET_CREATE"]
    }
  ],
  "pending_declarations": {
    "baseline_status": "PENDING_PILOT",
    "corporate_target_status": "PENDING_AUTHORIZED_INPUT",
    "supplier_integration_status": "PENDING_INTEGRATION"
  }
}
```

---

### 3. Identity & Collision Protection Rules
- **Company Identity**: Subdomain must be globally unique. Subdomain collision with another company produces `CONFLICT` and blocks provisioning.
- **Store Identity**: Resolved by `[company_id, store_name]`. Store IDs are assigned naturally by auto-increment (never hardcoded).
- **Physical Product Identity**: Physical receiving protein (`CompanyProduct`). Core Lock v1 physical taxonomy is enforced (Ribeye ≠ Beef Ribs, Rack of Lamb ≠ Lamb Picanha, Chicken Thighs ≠ Drumsticks, Brazilian ≠ Cheddar Sausage).
- **Product Alias**: Alias mappings map menu/POS names to canonical physical proteins. Invalid mappings (e.g. `Cajun Ribeye` → `Beef Ribs`) produce `CONFLICT` and block provisioning.
- **User Accounts**: Email must not belong to another company. Cross-tenant user email collisions produce `CONFLICT` and block provisioning.
- **User Passwords**: Zero hardcoded production passwords. Users are provisioned with temporary default credentials and `force_change: true`.

---

### 4. Diff Engine Classification Matrix (`ProvisioningDiffEngine`)
Every entity in a manifest is categorized into:
- `CREATE`: Entity does not exist and will be safely provisioned.
- `UPDATE`: Entity exists and safe mutable fields will be updated.
- `UNCHANGED`: Entity exists and matches desired manifest state.
- `CONFLICT`: Unsafe contradiction (subdomain collision, cross-tenant email, taxonomy violation). Blocks execution.
- `REQUIRES_REVIEW`: Ambiguous state (e.g. Flank/Flap Meat bridge) requiring human authorization.
- `BLOCKED`: Dependency blocked by a prerequisite conflict.

---

### 5. Operational Command Interface (`tenantProvisionerCli.ts`)

```bash
# 1. Validate Schema & Taxonomy Rules
npx ts-node src/tools/tenantProvisionerCli.ts validate <manifest-file.json>

# 2. Execute Dry Run & View Diff Report (Zero DB Mutations)
npx ts-node src/tools/tenantProvisionerCli.ts plan <manifest-file.json>

# 3. Apply Provisioning (Transactional Write & Post-Health Verification)
npx ts-node src/tools/tenantProvisionerCli.ts apply <manifest-file.json>
```

---

### 6. Audit & Provisioning Run Tracking (`ProvisioningRun`)
Every Dry Run and Apply execution is audited in the `ProvisioningRun` table, recording:
- `manifest_id` & `manifest_version`
- `manifest_hash` (SHA-256 over normalized JSON string)
- `company_subdomain`
- `mode` (`DRY_RUN` vs `APPLY`)
- `status` (`VALIDATED`, `COMPLETED`, `FAILED`, `BLOCKED`, `REQUIRES_REVIEW`)
- `summary_json` (Detailed entity diff counts and health report)
- `initiated_by`

---

### 7. Post-Provisioning Health Verification
After `apply()`, `TenantProvisioner.validatePostProvisionHealth()` automatically confirms:
1. Company exists in DB.
2. All declared stores exist.
3. All declared canonical products exist.
4. All declared users belong to company.
5. Zero cross-tenant entity linkages exist.
6. Returns status: `HEALTHY` or `HEALTHY_WITH_PENDING_CONFIGURATION`.
