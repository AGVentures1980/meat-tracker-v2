import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface ParsedObjects {
  tables: string[];
  columns: { table: string; column: string }[];
  enums: { name: string; value: string }[];
  indices: string[];
  hasDestructive: boolean;
  destructiveReasons: string[];
}

export class PrismaMigrationGuard {
  static async run() {
    console.log('[SRE Guard] Booting PrismaMigrationGuard Zero-Trust validation...');

    const dbUrl = process.env.DATABASE_URL || '';
    const dbFingerprint = crypto.createHash('md5').update(dbUrl).digest('hex').substring(0, 8);
    const env = process.env.NODE_ENV || 'development';

    try {
      // 1. Detect Failed
      const failedMigration = await this.detectFailedMigrations();
      if (!failedMigration) {
        console.log(`[SRE Guard] ✅ NO_ACTION. No failed/pending migrations detected.`);
        return { decision: 'NO_ACTION' };
      }

      console.log(`[SRE Guard] ⚠️ Detected FAILED or PENDING migration: ${failedMigration}`);

      // 2. Parse SQL
      const parsed = this.parseMigrationSQL(failedMigration);
      
      // Strict rule: No Destructive Fixes
      if (parsed.hasDestructive) {
        return this.blockAndAlert(failedMigration, dbFingerprint, env, `Contains destructive SQL operations: ${parsed.destructiveReasons.join(', ')}`);
      }

      // 3. Inspect PostgreSQL Catalog
      const verification = await this.verifyPhysicalSchema(parsed);

      console.log(`[SRE Guard] Physical schema compliance: ${Math.round(verification.score * 100)}% (${verification.found}/${verification.total} objects found)`);

      // 4. Evaluate Policy
      if (verification.isFullyCompliant) {
        console.log(`[SRE Guard] 🟢 SAFE_AUTO_RESOLVE. All ${verification.total} expected schema objects natively exist.`);
        this.executeAutoResolve(failedMigration, dbFingerprint, env);
        return { decision: 'SAFE_AUTO_RESOLVE' };
      } else {
        const missingObjectsLog = verification.missingDetails.join(' | ');
        return this.blockAndAlert(failedMigration, dbFingerprint, env, `Schema partially compliant or mismatched. Missing objects: ${missingObjectsLog}`);
      }

    } catch (err: any) {
      if (err.message && err.message.includes('relation "_prisma_migrations" does not exist')) {
        console.log(`[SRE Guard] ✅ NO_ACTION. Clean database detected (_prisma_migrations absent).`);
        return { decision: 'NO_ACTION' };
      }
      if (process.env.TEST_MODE === 'true') {
          throw err;
      }
      console.error(`[SRE Guard] 🚨 CRITICAL GUARDIAN FAILURE: ${err.message}`);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  public static async detectFailedMigrations(): Promise<string | null> {
    const records = await prisma.$queryRaw<any[]>`
      SELECT migration_name, finished_at, rolled_back_at 
      FROM _prisma_migrations 
      ORDER BY started_at ASC;
    `;

    for (const record of records) {
      if (!record.finished_at || record.rolled_back_at) {
        return record.migration_name;
      }
    }
    return null;
  }

  public static parseMigrationSQL(migrationName: string): ParsedObjects {
    const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration SQL not found at repository: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    const parsed: ParsedObjects = {
      tables: [],
      columns: [],
      enums: [],
      indices: [],
      hasDestructive: false,
      destructiveReasons: []
    };

    // Regex Checkers
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const stmt of statements) {
      const sLower = stmt.toLowerCase();
      
      // Destructive check
      if (sLower.includes('drop table') || sLower.includes('drop column') || sLower.includes('rename to') || sLower.includes('alter type') && sLower.includes('drop')) {
        parsed.hasDestructive = true;
        parsed.destructiveReasons.push(stmt.substring(0, 40) + '...');
      }

      // 1. Create Table
      const createTableMatch = stmt.match(/CREATE\s+TABLE\s+"([^"]+)"/i);
      if (createTableMatch) {
        parsed.tables.push(createTableMatch[1]);
      }

      // 2. Alter Table Add Column
      const alterTableMatch = stmt.match(/ALTER\s+TABLE\s+"([^"]+)"\s+ADD\s+COLUMN\s+"([^"]+)"/i);
      if (alterTableMatch) {
        parsed.columns.push({ table: alterTableMatch[1], column: alterTableMatch[2] });
      }

      // Also match multi-adds inside Alter Table (simplified parsing)
      if (stmt.match(/ALTER\s+TABLE\s+"([^"]+)"/i) && !alterTableMatch) {
        const table = stmt.match(/ALTER\s+TABLE\s+"([^"]+)"/i)![1];
        const lines = stmt.split('\n');
        for (const line of lines) {
          const colMatch = line.match(/ADD\s+COLUMN\s+"([^"]+)"/i);
          if (colMatch) {
            parsed.columns.push({ table, column: colMatch[1] });
          }
        }
      }

      // 3. Alter Type Add Value (Enum)
      const alterTypeMatch = stmt.match(/ALTER\s+TYPE\s+"([^"]+)"\s+ADD\s+VALUE\s+'([^']+)'/i);
      if (alterTypeMatch) {
         parsed.enums.push({ name: alterTypeMatch[1], value: alterTypeMatch[2] });
      }

      // 4. Create Index
      const createIdxMatch = stmt.match(/CREATE\s+(?:(?:UNIQUE\s+)?INDEX)\s+"([^"]+)"/i);
      if (createIdxMatch) {
         parsed.indices.push(createIdxMatch[1]);
      }
    }

    return parsed;
  }

  public static async verifyPhysicalSchema(parsed: ParsedObjects) {
    let missingDetails: string[] = [];
    let foundCount = 0;
    
    // Some basic deductions. E.g if we are parsing complex indices we might just check if ANY index on that table with that name exists.
    const totalCount = parsed.tables.length + parsed.columns.length + parsed.enums.length + parsed.indices.length;
    
    if (totalCount === 0) {
       // A hollow migration is technically compliant
       return { isFullyCompliant: true, score: 1, found: 0, total: 0, missingDetails: [] };
    }

    // 1. Tables
    if (parsed.tables.length > 0) {
      const dbTables = await prisma.$queryRaw<any[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public';`;
      const extantTables = new Set(dbTables.map(t => t.tablename));
      for (const t of parsed.tables) {
        if (extantTables.has(t)) {
          foundCount++;
        } else {
          missingDetails.push(`Table[${t}]`);
        }
      }
    }

    // 2. Columns
    for (const c of parsed.columns) {
      const cols = await prisma.$queryRaw<any[]>`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = ${c.table} AND column_name = ${c.column};
      `;
      if (cols.length > 0) {
        foundCount++;
      } else {
        missingDetails.push(`Column[${c.table}.${c.column}]`);
      }
    }

    // 3. Enums
    for (const e of parsed.enums) {
       // pg_type to pg_enum join
       const enumVals = await prisma.$queryRaw<any[]>`
         SELECT e.enumlabel 
         FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         WHERE t.typname = ${e.name} AND e.enumlabel = ${e.value};
       `;
       if (enumVals.length > 0) {
         foundCount++;
       } else {
         missingDetails.push(`Enum[${e.name}='${e.value}']`);
       }
    }

    // 4. Indices
    if (parsed.indices.length > 0) {
      const pgIndexes = await prisma.$queryRaw<any[]>`SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`;
      const extantIndexes = new Set(pgIndexes.map(i => i.indexname));
      for (const idx of parsed.indices) {
        if (extantIndexes.has(idx)) {
          foundCount++;
        } else {
          missingDetails.push(`Index[${idx}]`);
        }
      }
    }

    const isFullyCompliant = foundCount === totalCount;
    return {
      isFullyCompliant,
      score: foundCount / totalCount,
      found: foundCount,
      total: totalCount,
      missingDetails
    };
  }

  public static blockAndAlert(migration: string, fingerprint: string, env: string, reason: string) {
    const payload = {
        migration_name: migration,
        decision: 'BLOCK_AND_ALERT',
        database_fingerprint: fingerprint,
        reason: reason,
        actions_taken: 'Aborted process.exit(1) to prevent destructive overlap.'
    };
    
    console.error(`\n🚨 [SRE Guard] FATAL BLOCK: ${migration}`);
    console.error(`🚨 Reason: ${reason}`);
    console.error(`🚨 Emit to Datadog/Slack: ${JSON.stringify(payload)}`);
    
    // Returning payload for testing, otherwise we throw rather than exit to avoid killing the test runner.
    if (process.env.TEST_MODE === 'true') {
        throw new Error('BLOCK_AND_ALERT: ' + reason);
    }
    process.exit(1);
  }

  public static executeAutoResolve(migration: string, fingerprint: string, env: string) {
     const payload = {
         migration_name: migration,
         decision: 'SAFE_AUTO_RESOLVE',
         database_fingerprint: fingerprint,
         reason: 'Physical Postgres Schema fully 100% compliant with expected Migration SQL.',
         actions_taken: 'Executing npx prisma migrate resolve'
     };

     console.log(`\n🛡️  [SRE Guard] Initiating Self-Healing Command...`);
     console.log(`📡 Log Emit: ${JSON.stringify(payload)}`);

     if (process.env.TEST_MODE === 'true') {
         return 'SAFE_AUTO_RESOLVE';
     }

     try {
       // Execute the CLI command synchronously
       const stdout = execSync(`npx prisma migrate resolve --applied ${migration}`, { encoding: 'utf-8', stdio: 'pipe' });
       console.log(`🛡️  [SRE Guard] Resolve Success: ${stdout}`);
     } catch (err: any) {
       console.error(`🚨 [SRE Guard] Failed to auto-resolve! ${err.message}`);
       process.exit(1);
     }
  }
}
