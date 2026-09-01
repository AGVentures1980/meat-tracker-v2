# PILOT DATA CLASSIFICATION NOTES
## BRASA HQ — Central Strategic Memory Repository
### Phase 1.5 — Database Isolation & Scoping Standard

**Document Version:** 1.0.0  
**Classification:** Enterprise Strategic Confidential  
**Owner:** Director of Quality Assurance & Platform Integrity  
**Date of Audit:** 2026-06-01  
**Status:** ACTIVE — IMPLEMENTATION COMPLETE  

---

## 1. Overview of StoreDataType Schema Isolation

To ensure that the sales process and test data do not interfere with real operational calculations for pilot clients, we introduced a strict compile-time and runtime database segregation mechanism using a Prisma enum.

### Schema Definition
In [schema.prisma](file:///Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/prisma/schema.prisma), the `Store` model now includes a `data_type` column matching the `StoreDataType` enum:

```prisma
enum StoreDataType {
  LIVE
  DEMO
}

model Store {
  id                Int           @id @default(autoincrement())
  store_name        String
  data_type         StoreDataType @default(DEMO)
  // other fields...
}
```

> [!IMPORTANT]
> The default value is strictly set to `DEMO`. Any newly seeded or created stores automatically default to `DEMO` isolation. A store must be explicitly promoted to `LIVE` via an authorized database migration or script.

---

## 2. Store Classifications

Based on the [PRE_IMPLEMENTATION_STORE_AUDIT.md](file:///Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/docs/hq/PRE_IMPLEMENTATION_STORE_AUDIT.md), all existing 15 stores in the database have been classified. 

### Active Store Classification Matrix

| Store ID | Store Name | Company | Initial Classification | Current Status |
| :---: | :--- | :--- | :---: | :---: |
| **4** | Stamford | Terra Gaucha | **LIVE** | Active Pilot Site |
| **1** | Outback - Dallas Pilot | Bloomin' Brands | **DEMO** | Static Sales Pitch |
| **2** | Jacksonville | Terra Gaucha | **DEMO** | Static Seed |
| **3** | Tampa | Terra Gaucha | **DEMO** | Static Seed |
| **5** | Indianapolis | Terra Gaucha | **DEMO** | Static Seed |
| **6** | Omaha | Terra Gaucha | **DEMO** | Static Seed |
| **7** | Rockville | Terra Gaucha | **DEMO** | Static Seed |
| **8** | Orlando | Terra Gaucha | **DEMO** | Static Seed |
| **9** | Tampa Casino | Hard Rock Hotel & Casino | **DEMO** | Static Seed |
| **10** | Hollywood | Hard Rock Hotel & Casino | **DEMO** | Static Seed |
| **11** | Punta Cana | Hard Rock Hotel & Casino | **DEMO** | Static Seed |
| **12** | Outback Tampa | Bloomin' Brands | **DEMO** | Static Seed |
| **13** | Outback Houston | Bloomin' Brands | **DEMO** | Static Seed |
| **14** | Outback NYC | Bloomin' Brands | **DEMO** | Static Seed |
| **1205** | Atlantic City Casino | Hard Rock Hotel & Casino | **DEMO** | Static Sales Pitch |

---

## 3. Runtime Query Isolation Details

The `data_type` filter is dynamically applied inside [MeatEngine.ts](file:///Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/src/engine/MeatEngine.ts) to restrict data aggregation.

```typescript
// Apply DEMO/LIVE Data Isolation
if (!where.id) {
    const liveCount = await prisma.store.count({
        where: { ...where, data_type: 'LIVE' }
    });
    if (liveCount > 0) {
        where.data_type = 'LIVE';
    } else {
        where.data_type = 'DEMO';
    }
}
```

### Isolation Behavior
1. **Pilot Context (`LIVE` Mode):** If a user logs in and the scoped query resolves any `LIVE` store under their access scope, only data for stores with `data_type: 'LIVE'` is returned. This prevents demo/test data from skewing dashboard metrics.
2. **Sales/Demo Context (`DEMO` Mode):** If no live stores exist under the query scope, the system falls back to `DEMO` to allow sales personnel to showcase seeded data.

---

## 4. Promotion & Rollback Protocol

### Explicit Promotion Protocol
To promote a store from `DEMO` to `LIVE` status, run the following SQL command or a Prisma equivalent:
```sql
UPDATE "Store" SET "data_type" = 'LIVE' WHERE "id" = <STORE_ID>;
```

### Rollback Protocol
To revert the schema to pre-migration conditions:
```sql
ALTER TABLE "Store" DROP COLUMN IF EXISTS "data_type";
DROP TYPE IF EXISTS "StoreDataType";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260601160300_add_store_data_type';
```
