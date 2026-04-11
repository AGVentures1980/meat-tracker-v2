import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ==========================================
// 1. STATE MACHINE DO SISTEMA
// ==========================================
export type MigrationState = 'NOT_FOUND' | 'APPLIED' | 'PARTIAL_FAILED' | 'ROLLED_BACK' | 'DRIFT_DETECTED';

interface MigrationStatus {
  name: string;
  state: MigrationState;
  sqlPath?: string;
}

// 6. LOGGING ESTRUTURADO
interface SRELog {
  migration: string;
  state: MigrationState;
  action: 'RESOLVE_APPLIED' | 'RESOLVE_ROLLED_BACK' | 'BLOCK' | 'SKIP' | 'NO_ACTION';
  reason: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

function logSRE(payload: SRELog) {
  const isCritical = payload.severity === 'CRITICAL';
  const prefix = isCritical ? '🚨 [SRE-GUARD-CRITICAL]' : payload.severity === 'WARNING' ? '⚠️ [SRE-GUARD-WARN]' : '✅ [SRE-GUARD-INFO]';
  console[isCritical ? 'error' : 'log'](`${prefix} ${JSON.stringify(payload)}`);
}

// ==========================================
// 3. IMPLEMENTAÇÃO (NODE.JS REAL)
// ==========================================

export async function safeMigrationGuard() {
  console.log('[SRE Guard V2] Booting PrismaMigrationGuard Production-Grade...');

  try {
    // 4. QUERY REAL NO POSTGRES (Embracing pg_try_advisory_xact_lock to prevent Multi-Dyno Racing P3008)
    await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<any[]>`SELECT pg_try_advisory_xact_lock(999999) as got_lock;`;
      
      if (!lock[0].got_lock) {
        logSRE({
          migration: 'GLOBAL',
          state: 'APPLIED',
          action: 'SKIP',
          reason: 'Another replica/container is currently verifying migrations. Skipping organically to maintain Idempotency.',
          severity: 'INFO'
        });
        return;
      }

      const migrationsInDb = await tx.$queryRaw<any[]>`
        SELECT migration_name, 
               finished_at, 
               rolled_back_at, 
               checksum 
        FROM _prisma_migrations 
        ORDER BY started_at ASC;
      `;

      if (!migrationsInDb || migrationsInDb.length === 0) {
        logSRE({
          migration: 'GLOBAL',
          state: 'NOT_FOUND',
          action: 'NO_ACTION',
          reason: 'Clean database detected. No _prisma_migrations records present.',
          severity: 'INFO'
        });
        return;
      }

      for (const dbRecord of migrationsInDb) {
        const status = getMigrationState(dbRecord);

        // System behavior strictly controlled by the State Machine
        switch (status.state) {
          
          case 'APPLIED':
            continue;

          case 'NOT_FOUND':
            if (shouldBlock({ hasDestructive: false }, status.state)) {
               executeSafeBlock(status, 'Migration missing from local repository. Manual SRE validation required to prevent drift.');
            }
            break;

          case 'PARTIAL_FAILED':
            await handlePendingMigration(status, 'applied');
            break;

          case 'ROLLED_BACK':
            await handlePendingMigration(status, 'rolled_back');
            break;

          case 'DRIFT_DETECTED':
            executeSafeBlock(status, 'Checksum mismatch. Local file was altered after Database execution.');
            break;
        }
      }
      
      logSRE({
        migration: 'ALL',
        state: 'APPLIED',
        action: 'NO_ACTION',
        reason: 'All recorded database migrations are in valid state. Proceeding normal boot.',
        severity: 'INFO'
      });

    }, { timeout: 30000 });

  } catch (err: any) {
    // 8. FAIL-SAFE DESIGN: Em qualquer falha de banco de dados ou erro de engine... BLOCK!
    if (err.message && err.message.includes('relation "_prisma_migrations" does not exist')) {
        logSRE({
          migration: 'GLOBAL',
          state: 'NOT_FOUND',
          action: 'NO_ACTION',
          reason: 'Database schema is totally uninitialized (missing _prisma_migrations table). Permitting organic deployment.',
          severity: 'INFO'
        });
        return;
    }
    
    logSRE({
      migration: 'UNKNOWN',
      state: 'PARTIAL_FAILED',
      action: 'BLOCK',
      reason: `Fail-Safe Interceptor activated due to internal execution error: ${err.message}`,
      severity: 'CRITICAL'
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ------------------------------------------
// Funções auxiliares
// ------------------------------------------

function getMigrationState(dbRecord: any): MigrationStatus {
  // Interpretando finished_at:
  // - finished_at NULL = falhou ou foi abortada (PARTIAL / FAILED)
  // - finished_at NOT NULL = concluída com sucesso (APPLIED)
  
  const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', dbRecord.migration_name, 'migration.sql');
  const fileExists = fs.existsSync(migrationPath);

  if (!fileExists) {
    return { name: dbRecord.migration_name, state: 'NOT_FOUND' };
  }

  // Idempotência precisa
  if (dbRecord.rolled_back_at !== null) {
    return { name: dbRecord.migration_name, state: 'ROLLED_BACK', sqlPath: migrationPath };
  }
  
  if (dbRecord.finished_at === null) {
    return { name: dbRecord.migration_name, state: 'PARTIAL_FAILED', sqlPath: migrationPath };
  }

  return { name: dbRecord.migration_name, state: 'APPLIED', sqlPath: migrationPath };
}

async function handlePendingMigration(status: MigrationStatus, targetResolution: 'applied' | 'rolled_back') {
   const sql = fs.readFileSync(status.sqlPath!, 'utf8');
   const parsed = parseMigrationRisk(sql);

   // 7. ESTRATÉGIA DE SEGURANÇA: NUNCA RESOLVER CEGAMENTE SEM VALIDAR O ESCOPO
   const isDestructive = shouldBlock(parsed, status.state);
   if (isDestructive) {
      executeSafeBlock(status, 'Destructive operation detected in unfinishable migration.');
      return;
   }

   const safeToResolve = await shouldResolve(parsed);
   if (safeToResolve) {
      executeSafeResolve(status, targetResolution);
   } else {
      executeSafeBlock(status, 'Physical Postgres objects do not match the expected SQL objects. Partial failure without auto-recover capability.');
   }
}

function shouldBlock(parsed: { hasDestructive: boolean }, state: MigrationState): boolean {
  // 5. PROTEÇÃO CONTRA ERROS
  // Bloquear caso a migração seja perigosa ou demande intervenção manual de SRE.
  if (state === 'NOT_FOUND') return true;
  if (state === 'DRIFT_DETECTED') return true;
  
  // Regra de Ouro (Garcia Rule): NUNCA automatizar DROP. Sempre Crash.
  return parsed.hasDestructive;
}

async function shouldResolve(parsed: any): Promise<boolean> {
  // Shadow validation do esquema atual vs banco vivo (Idempotency Engine)
  // Verifica se todos os objetos de Table, Enum e Add Columns exigidos já existem na base real.
  
  let validObjects = 0;
  const totalExpected = parsed.tables.length + parsed.columns.length + parsed.enums.length;
  
  if (totalExpected === 0) return true; // Hollow migration, perfectly safe.

  try {
      if (parsed.tables.length > 0) {
        const dbTables = await prisma.$queryRaw<any[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public';`;
        const names = new Set(dbTables.map(t => t.tablename));
        parsed.tables.forEach((t: string) => names.has(t) && validObjects++);
      }

      for (const c of parsed.columns) {
        const cols = await prisma.$queryRaw<any[]>`SELECT column_name FROM information_schema.columns WHERE table_name = ${c.table} AND column_name = ${c.column};`;
        if (cols.length > 0) validObjects++;
      }

      for (const e of parsed.enums) {
        const enumVals = await prisma.$queryRaw<any[]>`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = ${e.name} AND e.enumlabel = ${e.value};`;
        if (enumVals.length > 0) validObjects++;
      }
      
      // Motor restrito: SÓ resolve via AUTO se o score físico for 100% igual à exigência.
      return validObjects === totalExpected;

  } catch (err) {
      return false;
  }
}

function executeSafeResolve(status: MigrationStatus, targetResolution: 'applied' | 'rolled_back') {
  // Correção de P3008: Evitar chamar `npx prisma migrate resolve --applied` para algo que já está `rolled_back`
  // E nunca chamar se já for APPLIED nativamente!
  
  const flag = targetResolution === 'applied' ? '--applied' : '--rolled-back';
  
  logSRE({
    migration: status.name,
    state: status.state,
    action: targetResolution === 'applied' ? 'RESOLVE_APPLIED' : 'RESOLVE_ROLLED_BACK',
    reason: `System verified 100% physical compatibility. Emitting 100% idempotent resolve ${flag}`,
    severity: 'WARNING'
  });

  if (process.env.TEST_MODE === 'true') {
     return;
  }

  try {
     const resolveOut = execSync(`npx prisma migrate resolve ${flag} ${status.name}`, { encoding: 'utf8', stdio: 'pipe' });
     console.log(`[SRE Guard V2] Resolved organically: ${resolveOut}`);
  } catch (err: any) {
      logSRE({
          migration: status.name,
          state: status.state,
          action: 'BLOCK',
          reason: `Failed to safely execute raw CLI resolve: ${err.message}`,
          severity: 'CRITICAL'
      });
      process.exit(1);
  }
}

function executeSafeBlock(status: MigrationStatus, reason: string) {
    logSRE({
      migration: status.name,
      state: status.state,
      action: 'BLOCK',
      reason: reason,
      severity: 'CRITICAL'
    });

    if (process.env.TEST_MODE === 'true') {
        throw new Error(`CRITICAL BLOCK: ${reason}`);
    }
    
    // Fail-Safe hard termination for railway dynos. Requires DBA Manual Unlock.
    process.exit(1);
}

// Simple Parser Tool for extraction
function parseMigrationRisk(sql: string) {
    const sLower = sql.toLowerCase();
    const parsed = { tables: [] as string[], columns: [] as any[], enums: [] as any[], hasDestructive: false };

    if (sLower.includes('drop table') || sLower.includes('drop column') || sLower.includes('rename to') || (sLower.includes('alter type') && sLower.includes('drop'))) {
        parsed.hasDestructive = true;
    }

    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      const tb = stmt.match(/CREATE\s+TABLE\s+"([^"]+)"/i);
      if (tb) parsed.tables.push(tb[1]);

      const col = stmt.match(/ALTER\s+TABLE\s+"([^"]+)"\s+ADD\s+COLUMN\s+"([^"]+)"/i);
      if (col) parsed.columns.push({ table: col[1], column: col[2] });

      const en = stmt.match(/ALTER\s+TYPE\s+"([^"]+)"\s+ADD\s+VALUE\s+'([^']+)'/i);
      if (en) parsed.enums.push({ name: en[1], value: en[2] });
    }
    return parsed;
}
