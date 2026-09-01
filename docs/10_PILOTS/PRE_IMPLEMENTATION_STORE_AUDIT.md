# PRE-IMPLEMENTATION STORE AUDIT
## BRASA HQ — Central Strategic Memory Repository
### Phase 1.5 — Pre-Migration Database Integrity & Telemetry Audit

**Document Version:** 1.0.0  
**Classification:** Enterprise Strategic Confidential  
**Owner:** Director of Quality Assurance & Platform Integrity  
**Date of Audit:** 2026-06-01  
**Status:** COMPLETE — READY FOR REVIEW  

---

## 1. Executive Summary

Before implementing the `StoreDataType` database migration (which introduces compile-time schema isolation separating `LIVE` and `DEMO` stores), this audit establishes a definitive, verified inventory of all existing stores in the local PostgreSQL instance. 

The primary objective is to evaluate each of the **15 stores** currently defined in the database and determine their eligibility to be classified as `LIVE` or `DEMO`. By performing a comprehensive query of all database tables, we verify data volumes, identify any mixed-data contaminants, and recommend safe, structured pilot candidates.

**Key Finding:** Every transactional and operational telemetry table in this database instance (`InvoiceRecord`, `Order`, `InventoryRecord`, `PurchaseRecord`, `MeatUsage`, etc.) contains exactly **0 rows**. Only configuration entities (such as `Store` metadata and `Outlet` definitions) are populated. As a result, no data contamination or mixed operational data exists. However, structural classifications must be strictly established now to prevent future demo data from leaking into live pilot dashboards.

---

## 2. Database Environment & Global Counts

The database audit was conducted against the local PostgreSQL instance using Prisma Client:
*   **Database URL:** `postgresql://alexandregarcia@localhost:5432/brasa_meat_tracker?schema=public`

### Global Table Counts Summary

| Table / Prisma Model | Row Count | Status / Notes |
| :--- | :--- | :--- |
| **Company** | 3 | Verified: Terra Gaucha, Hard Rock, Bloomin' Brands |
| **Store** | 15 | Active metadata configurations |
| **Outlet** | 83 | Distribution-point stubs (kitchens, bars, dining rooms) |
| **InvoiceRecord** | 0 | Empty — No receiving events loaded |
| **Order** | 0 | Empty — No POS cover logs loaded |
| **InventoryRecord** | 0 | Empty — No storage audits loaded |
| **PurchaseRecord** | 0 | Empty — No distributor purchasing data loaded |
| **MeatUsage** | 0 | Empty — No calculated consumption statistics |
| **Report** | 0 | Empty — No historical monthly reports present |
| **BarcodeScanEvent** | 0 | Empty — No receiving scans recorded |

---

## 3. Complete Store Inventory Audit Table

Below is the exhaustive audit of the 15 stores currently present in the database.

| Store ID | Store Name | Company Name | Subdomain | Creation Date | Data Volume | Invoices | Orders | Inventory | Seeded? | Demo? | Real Data? | Status | Recommended Classification |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | Outback - Dallas Pilot | Bloomin' Brands | `outback` | 2026-04-11 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **REVIEW REQUIRED** |
| **2** | Jacksonville | Terra Gaucha | `terra` | 2026-04-14 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **3** | Tampa | Terra Gaucha | `terra` | 2026-04-14 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **4** | Stamford | Terra Gaucha | `terra` | 2026-04-14 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **LIVE** (Pilot Candidate) |
| **5** | Indianapolis | Terra Gaucha | `terra` | 2026-04-14 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **6** | Omaha | Terra Gaucha | `terra` | 2026-04-14 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **7** | Rockville | Terra Gaucha | `terra` | 2026-04-14 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **8** | Orlando | Terra Gaucha | `terra` | 2026-04-14 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **9** | Tampa Casino | Hard Rock Hotel & Casino | `hardrock` | 2026-04-21 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **10** | Hollywood | Hard Rock Hotel & Casino | `hardrock` | 2026-04-21 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **11** | Punta Cana | Hard Rock Hotel & Casino | `hardrock` | 2026-04-21 | 0 | 0 | 0 | 0 | No | No | No | INACTIVE | **DEMO** |
| **12** | Outback Tampa | Bloomin' Brands | `outback` | 2026-04-30 | 0 | 0 | 0 | 0 | No | No | No | ACTIVE | **DEMO** |
| **13** | Outback Houston | Bloomin' Brands | `outback` | 2026-04-30 | 0 | 0 | 0 | 0 | No | No | No | ACTIVE | **DEMO** |
| **14** | Outback NYC | Bloomin' Brands | `outback` | 2026-04-30 | 0 | 0 | 0 | 0 | No | No | No | ACTIVE | **DEMO** |
| **1205** | Atlantic City Casino | Hard Rock Hotel & Casino | `hardrock` | 2026-04-21 | 0 | 0 | 0 | 0 | No | No | No | ACTIVE | **REVIEW REQUIRED** |

*Note: Data Volume represents the sum of rows across transactional/operational tables for that specific store.*

---

## 4. Detailed Store Profiles

### 4.1 Bloomin' Brands (Subdomain: `outback`)

#### Store ID 1: Outback - Dallas Pilot
*   **Creation Date:** 2026-04-11T05:11:46.636Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 5 (Main Kitchen (Grill), Prep Station, To-Go / Delivery, Main Dining Room, Bar)
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **REVIEW REQUIRED**
*   **Detailed Rationale:** Although explicitly marked as a pilot candidate (`is_pilot: true`), this location belongs to Bloomin' Brands, which is currently categorized as a "strategic sales target" rather than an active contracted pilot customer. The store is inactive and contains no transactional data. If a pilot is eventually approved, this metadata can be utilized, but it must be kept as `DEMO` or `REVIEW REQUIRED` initially to prevent accidental promotion.

#### Store ID 12: Outback Tampa
*   **Creation Date:** 2026-04-30T14:46:21.142Z
*   **Operational Status:** ACTIVE (is_pilot: false)
*   **Configured Outlets:** 5 (Main Kitchen (Grill), Prep Station, To-Go / Delivery, Main Dining Room, Bar)
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Labeled as non-pilot and active, this store is a static metadata placeholder representing a standard Outback restaurant. It contains no operational data and should remain permanently classified as `DEMO`.

#### Store ID 13: Outback Houston
*   **Creation Date:** 2026-04-30T14:46:21.150Z
*   **Operational Status:** ACTIVE (is_pilot: false)
*   **Configured Outlets:** 5 (Main Kitchen (Grill), Prep Station, To-Go / Delivery, Main Dining Room, Bar)
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Identical to ID 12. Set up as a static metadata placeholder for demos. Must remain `DEMO`.

#### Store ID 14: Outback NYC
*   **Creation Date:** 2026-04-30T14:46:21.151Z
*   **Operational Status:** ACTIVE (is_pilot: false)
*   **Configured Outlets:** 5 (Main Kitchen (Grill), Prep Station, To-Go / Delivery, Main Dining Room, Bar)
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Identical to ID 12. Set up as a static metadata placeholder for demos. Must remain `DEMO`.

---

### 4.2 Terra Gaucha (Subdomain: `terra`)

#### Store ID 4: Stamford (Flagship)
*   **Creation Date:** 2026-04-14T17:20:49.360Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 0
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **LIVE** (Candidate for active pilot promotion)
*   **Detailed Rationale:** Stamford is formally documented as the **Flagship Pilot Store** for Terra Gaucha. The company is actively engaged as an operational calibration partner. It has explicit target specifications configured (`target_lbs_guest: 1.85`) and an assigned executive owner Paulo Simonetti (`paulo@terragaucha.com`). While the database is currently empty, this store should be promoted to `LIVE` as soon as real telemetry ingestion begins.

#### Store ID 2: Jacksonville
*   **Creation Date:** 2026-04-14T17:20:49.351Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 0
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Part of the Terra Gaucha metadata seed. While it is marked as a pilot candidate, Stamford is the only active pilot location for Terra Gaucha in Phase 1. To isolate the pilot's aggregate metrics, Jacksonville must remain classified as `DEMO` until the rollout expands.

#### Store ID 3: Tampa
*   **Creation Date:** 2026-04-14T17:20:49.358Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 0
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Inactive metadata placeholder. Must default to `DEMO` to avoid dashboard pollution.

#### Store ID 5: Indianapolis
*   **Creation Date:** 2026-04-14T17:20:49.361Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 0
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Inactive metadata placeholder. Must default to `DEMO` to avoid dashboard pollution.

#### Store ID 6: Omaha
*   **Creation Date:** 2026-04-14T17:20:49.363Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 0
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Inactive metadata placeholder. Must default to `DEMO` to avoid dashboard pollution.

#### Store ID 7: Rockville
*   **Creation Date:** 2026-04-14T17:20:49.365Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 0
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Inactive metadata placeholder. Must default to `DEMO` to avoid dashboard pollution.

#### Store ID 8: Orlando
*   **Creation Date:** 2026-04-14T17:21:35.077Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 0
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Inactive metadata placeholder. Must default to `DEMO` to avoid dashboard pollution.

---

### 4.3 Hard Rock Hotel & Casino (Subdomain: `hardrock`)

#### Store ID 1205: Atlantic City Casino
*   **Creation Date:** 2026-04-21T21:40:07.892Z
*   **Operational Status:** ACTIVE (is_pilot: true)
*   **Configured Outlets:** 12 (including kitchen, bar, and dining points)
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **REVIEW REQUIRED**
*   **Detailed Rationale:** This is the only store marked as `is_pilot: true` that is also `ACTIVE` in the database. It represents a potential pilot site for the Hard Rock Cafe account, which is under active evaluation. However, there is zero transactional data in the database, and POS (Aloha) integrations are not yet verified. It should be classified as `REVIEW REQUIRED` and must remain isolated until a formal pilot agreement is finalized and connection parameters are mapped.

#### Store ID 9: Tampa Casino
*   **Creation Date:** 2026-04-21T18:44:29.594Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 16
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Part of the Hard Rock metadata seed. Since it is inactive and has no operational telemetry, it should be classified as `DEMO` to maintain isolation.

#### Store ID 10: Hollywood
*   **Creation Date:** 2026-04-21T18:44:29.598Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 20
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Part of the Hard Rock metadata seed. Since it is inactive and has no operational telemetry, it should be classified as `DEMO` to maintain isolation.

#### Store ID 11: Punta Cana
*   **Creation Date:** 2026-04-21T18:44:29.600Z
*   **Operational Status:** INACTIVE (is_pilot: true)
*   **Configured Outlets:** 9
*   **Seeded / Demo Data:** None
*   **Recommended Initial Classification:** **DEMO**
*   **Detailed Rationale:** Part of the Hard Rock metadata seed. Since it is inactive and has no operational telemetry, it should be classified as `DEMO` to maintain isolation.

---

## 5. Audit Recommendations & Analysis

### 5.1 mixed Data Isolation
No stores contain mixed data. All transactional tables in this local PostgreSQL database instance are currently empty. This provides a pristine, risk-free starting point to implement the `StoreDataType` column migration and establish strict default isolation parameters before real data is ingested.

### 5.2 Stores That Should NEVER Become LIVE
*   **Bloomin' Brands Placeholders:** `Outback Tampa` (ID 12), `Outback Houston` (ID 13), and `Outback NYC` (ID 14).
    *   *Reason:* These stores are static metadata stubs designed solely to represent standard non-pilot units for corporate demos. They should never be promoted to `LIVE` or receive real telemetry. They must remain `DEMO` permanently.

### 5.3 Safest First-Pilot Candidate
*   **Terra Gaucha Stamford (ID 4)**
    *   *Reason:* Terra Gaucha is BRASA's primary B2B operational calibration client. The Stamford location is explicitly documented in the onboarding runbooks as the flagship pilot site. It is pre-calibrated with operational specifications (`target_lbs_guest: 1.85`) and has a dedicated executive contact Paulo Simonetti (`paulo@terragaucha.com`). Deploying here first presents the lowest operational and organizational risk.

### 5.4 First Recommended LIVE Tenant
*   **Terra Gaucha Stamford (ID 4)**
    *   *Reason:* It is the most operationally ready candidate, with active corporate sponsorship and clear diagnostic targets. It should be the first store updated to `data_type: LIVE` once the database schema migration is deployed.

### 5.5 Permanent DEMO Stores
To maintain dashboard isolation and prevent sales pitch structures from polluting live audits, the following stores should remain classified as `DEMO` permanently:
1.  **Bloomin' Brands Placeholders:** Outback Tampa (ID 12), Outback Houston (ID 13), Outback NYC (ID 14).
2.  **Inactive Terra Gaucha Locations:** Jacksonville (ID 2), Tampa (ID 3), Indianapolis (ID 5), Omaha (ID 6), Rockville (ID 7), Orlando (ID 8).
3.  **Inactive Hard Rock Locations:** Tampa Casino (ID 9), Hollywood (ID 10), Punta Cana (ID 11).

---

## 6. Migration Operational Protocol

To enforce absolute isolation, the engineering team must execute the following protocol during the `StoreDataType` rollout:

1.  **Enforce Safe Schema Default:** The migration schema must set `StoreDataType` to default to `DEMO` for all new and existing stores:
    ```prisma
    enum StoreDataType {
      LIVE
      DEMO
    }

    model Store {
      ...
      data_type StoreDataType @default(DEMO)
      ...
    }
    ```
2.  **Perform Post-Migration Verification:** Run SQL to verify that all 15 stores default to `DEMO` immediately after the migration is applied.
3.  **Execute Explicit Promotion:** Promote Stamford to `LIVE` only via an explicit database script or SQL statement:
    ```sql
    UPDATE "Store" SET "data_type" = 'LIVE' WHERE "id" = 4;
    ```
4.  **Confirm Review Isolation:** Keep `Outback - Dallas Pilot` (ID 1) and `Atlantic City Casino` (ID 1205) under a status of `DEMO` or `REVIEW REQUIRED` until formal pilot agreements are signed and POS connection credentials are validated.

---
*Audit compiled and certified by platform engineering and platform operations team.*
