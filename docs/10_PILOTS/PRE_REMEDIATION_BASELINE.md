# PRE-REMEDIATION BASELINE
## BRASA HQ — Central Strategic Memory Repository
### Phase 1.5 — Pre-Migration Baseline & Rollback Checkpoint

**Document Version:** 1.0.0  
**Classification:** Enterprise Strategic Confidential  
**Owner:** Director of Quality Assurance & Platform Integrity  
**Baseline Date:** 2026-06-01  
**Status:** RECORDED — PRIOR TO REMEDIATION  

---

## 1. Git Baseline Context
*   **Current Git Branch:** `pitch-ready`
*   **Current Git Commit Hash:** `4824f990cb89c03f6f9627f09fc6e2c14fed0f11`
*   **Current Build Status:** SUCCESS (Verified clean compilation of client, server, and website via `npm run build`)

---

## 2. Database Inventory Baseline

### 2.1 Entity Counts

| Entity / Table | Count | Baseline Status |
| :--- | :---: | :--- |
| **Companies** | 3 | Verified: Terra Gaucha, Hard Rock Hotel & Casino, Bloomin' Brands |
| **Stores** | 15 | Active metadata configurations |
| **Outlets** | 83 | Sub-location routing definitions (kitchens, bars, etc.) |

### 2.2 Transactional / Operational Table Counts

| Table Name | Count | Data Present? |
| :--- | :---: | :---: |
| **InvoiceRecord** | 0 | **No** |
| **Order** | 0 | **No** |
| **InventoryRecord** | 0 | **No** |
| **PurchaseRecord** | 0 | **No** |
| **MeatUsage** | 0 | **No** |
| **ReceivingEvent** | 0 | **No** |
| **AuditLog** | 0 | **No** |
| **SystemAlert** | 0 | **No** |

**Confirmation Statement:** It is formally confirmed that all operational and transactional database tables are empty (0 rows) in this local PostgreSQL instance. There is no pre-existing live or mock operational data.

---

## 3. Store-by-Store Metadata Listing

| Store ID | Store Name | Company | Current Status | Recommended Future `data_type` |
| :---: | :--- | :--- | :---: | :---: |
| **1** | Outback - Dallas Pilot | Bloomin' Brands | INACTIVE | `DEMO` (Review Required) |
| **2** | Jacksonville | Terra Gaucha | INACTIVE | `DEMO` |
| **3** | Tampa | Terra Gaucha | INACTIVE | `DEMO` |
| **4** | Stamford | Terra Gaucha | INACTIVE | `LIVE` (Flagship Pilot Candidate) |
| **5** | Indianapolis | Terra Gaucha | INACTIVE | `DEMO` |
| **6** | Omaha | Terra Gaucha | INACTIVE | `DEMO` |
| **7** | Rockville | Terra Gaucha | INACTIVE | `DEMO` |
| **8** | Orlando | Terra Gaucha | INACTIVE | `DEMO` |
| **9** | Tampa Casino | Hard Rock Hotel & Casino | INACTIVE | `DEMO` |
| **10** | Hollywood | Hard Rock Hotel & Casino | INACTIVE | `DEMO` |
| **11** | Punta Cana | Hard Rock Hotel & Casino | INACTIVE | `DEMO` |
| **12** | Outback Tampa | Bloomin' Brands | ACTIVE | `DEMO` |
| **13** | Outback Houston | Bloomin' Brands | ACTIVE | `DEMO` |
| **14** | Outback NYC | Bloomin' Brands | ACTIVE | `DEMO` |
| **1205** | Atlantic City Casino | Hard Rock Hotel & Casino | ACTIVE | `DEMO` (Review Required) |

---

## 4. Prisma Schema Snapshot Reference
The database schema is defined in [schema.prisma](file:///Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/prisma/schema.prisma) under line 79 (`model Store`). 
At this baseline, the `Store` model does **not** contain the `data_type` column or reference the `StoreDataType` enum.

---

## 5. Environment Variables Status
*   **DATABASE_URL:** PRESENT (Points to local PostgreSQL instance `brasa_meat_tracker` on port 5432)
*   **REDIS_URL:** MISSING (Queue system currently defaults to mock adapter in local development)
*   **NODE_ENV:** Not explicitly set in `.env` (defaults to development environment)
*   **Railway Context:** Not applicable (running locally on macOS development environment)

---

## 6. Rollback Checkpoint Instructions

If the implementation encounters failures, execute the following commands to restore the baseline state:

### 6.1 Git Code Rollback
Discard all uncommitted changes and return to the baseline commit:
```bash
git reset --hard 4824f990cb89c03f6f9627f09fc6e2c14fed0f11
git clean -fd
```

### 6.2 Database / Prisma Rollback
If a database migration was applied and needs to be manually rolled back, run the following SQL command against PostgreSQL to drop the new column and type, then delete the migration record:
```sql
ALTER TABLE "Store" DROP COLUMN IF EXISTS "data_type";
DROP TYPE IF EXISTS "StoreDataType";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = 'add_store_data_type';
```

---

## 7. Declarative Statement
**“No remediation began before this checkpoint was recorded.”**
