# Database Scaling Strategy: Native PostgreSQL Partitioning

As Brasa Meat Intelligence expands horizontally across global tenants (Texas de Brazil, Fogo de Chão, Outback, etc.), telemetry tables such as `OperationYield`, `InventoryRecord`, and `Report` will experience exponential growth (potentially tens of millions of rows). 

While modern Postgres handles 10-50M rows comfortably, strict SLAs for dashboard responsiveness necessitate **Native Declarative Partitioning**.

## 1. Why Partition by `company_id`?
Since the backend uses a Zero-Trust `scopedPrisma` interceptor, *every* query is mathematically bounded by `company_id`. Partitioning by `company_id`:
- Confines index sizes (reducing memory thrashing)
- Speeds up queries (Constraint Exclusion)
- Makes dropping a churning client instant (`DROP TABLE operation_yields_clientx`) instead of executing an expensive `DELETE FROM` that causes vacuuming lag.

## 2. Table Conversion Schema

If we are converting `OperationYield`:

```sql
-- Step 1: Create the Master Partitioned Table
CREATE TABLE operation_yields (
    id UUID,
    company_id UUID NOT NULL,
    store_id INT,
    protein_id UUID,
    yield_val FLOAT,
    created_at TIMESTAMP
) PARTITION BY LIST (company_id);

-- Step 2: Create Client-Specific Partitions
CREATE TABLE operation_yields_tdb PARTITION OF operation_yields FOR VALUES IN ('tdb-company-id-hash');
CREATE TABLE operation_yields_outback PARTITION OF operation_yields FOR VALUES IN ('outback-company-id-hash');

-- Step 3: Default Partition (Crucial for Catching Unassigned Seeds)
CREATE TABLE operation_yields_default PARTITION OF operation_yields DEFAULT;
```

## 3. Prisma Considerations
Prisma does not inherently "understand" Postgres Partitions at the Schema level, but it natively supports querying them because they look like regular tables to the driver. 

**Migration Workflow:**
To convert an existing table:
1. Define the table as normal in `schema.prisma`.
2. Generate a baseline migration (`npx prisma migrate dev --create-only`).
3. Modify the generated `migration.sql` file BEFORE running it, injecting the `PARTITION BY LIST` syntax.
4. Add the initial partition creations in that same file.
5. Apply the migration.

## 4. Indexing Recommendations 
When deploying Partitions, ensure indices are localized to the partition (which Postgres 11+ does automatically when you index the parent).

Always use Composite Indexes aligning with user UI workflows:
```sql
CREATE INDEX idx_yields_company_store_time ON operation_yields (company_id, store_id, created_at DESC);
```
Since `COMPANY` scope dashboards fetch cross-store aggregates over time, this prevents forced sequential scans inside the partition.
