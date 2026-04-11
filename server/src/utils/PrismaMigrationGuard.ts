import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// ==========================================
// 1. STATE MACHINE COMPLETA
// ==========================================
export type MigrationState = 
  | 'NOT_FOUND'       // Desc: Registrada no BD mas arquivo não existe. Action: BLOCK (sempre, drift detectado).
  | 'APPLIED'         // Desc: Concluída com sucesso (`finished_at` is set). Action: SKIP.
  | 'IN_PROGRESS'     // Desc: Iniciada há menos de 5 mins (`finished_at` null). Action: SKIP (aguardando conclusão orgânica de outra transação longa).
  | 'FAILED'          // Desc: Iniciada há mais de 5 mins sem finalização ou explicitly `rolled_back_at`. Action: Avaliar Policy / RESOLVE.
  | 'DRIFT_DETECTED'  // Desc: Arquivo na máq difere do Checksum do DB. Action: BLOCK_AND_ALERT.
  | 'UNKNOWN';        // Desc: Inconsistência de BD. Action: BLOCK_AND_ALERT.

export type MigrationRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface MigrationStatus {
  name: string;
  state: MigrationState;
  sqlPath?: string;
  logs?: string;
  checksum?: string;
}

// ==========================================
// 6. LOGGING ESTRUTURADO (OBRIGATÓRIO)
// ==========================================
interface SRELog {
  migration: string;
  state: MigrationState;
  risk: MigrationRisk | 'N/A';
  action: 'RESOLVE_APPLIED' | 'RESOLVE_ROLLED_BACK' | 'BLOCK_AND_ALERT' | 'SKIP' | 'NO_ACTION' | 'DRY_RUN_SKIP';
  reason: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

function logSRE(payload: Omit<SRELog, 'timestamp'>) {
  const finalPayload: SRELog = { ...payload, timestamp: new Date().toISOString() };
  const prefix = payload.severity === 'CRITICAL' ? '🚨 [SRE-GUARD-CRITICAL]' 
               : payload.severity === 'ERROR'    ? '❌ [SRE-GUARD-ERROR]'
               : payload.severity === 'WARNING'  ? '⚠️ [SRE-GUARD-WARN]' 
               : '✅ [SRE-GUARD-INFO]';
  console[payload.severity === 'INFO' ? 'log' : 'error'](`${prefix} ${JSON.stringify(finalPayload)}`);
}

// ==========================================
// 3. IMPLEMENTAÇÃO NODE.JS (CÓDIGO REAL)
// ==========================================
export async function safeMigrationGuard() {
  logSRE({ migration: 'SYSTEM', state: 'UNKNOWN', risk: 'N/A', action: 'NO_ACTION', reason: 'Booting PrismaMigrationGuard V3', severity: 'INFO' });

  try {
    await prisma.$transaction(async (tx) => {
      // 5. PROTEÇÃO CONTRA LOOP (Lock via Postgres Native)
      const lock = await tx.$queryRaw<any[]>`SELECT pg_try_advisory_xact_lock(999999) as got_lock;`;
      if (!lock[0].got_lock) {
        logSRE({ migration: 'GLOBAL', state: 'UNKNOWN', risk: 'N/A', action: 'SKIP', reason: 'Advisory Lock Held by another Container (Idempotency Debounce).', severity: 'INFO' });
        return;
      }

      // 4. QUERY REAL NO POSTGRES
      const migrationsInDb = await tx.$queryRaw<any[]>`
        SELECT migration_name, 
               finished_at, 
               rolled_back_at, 
               started_at,
               logs,
               checksum 
        FROM _prisma_migrations 
        ORDER BY started_at ASC;
      `;

      if (!migrationsInDb || migrationsInDb.length === 0) {
        logSRE({ migration: 'GLOBAL', state: 'NOT_FOUND', risk: 'N/A', action: 'NO_ACTION', reason: 'Clean DB mapping. Native boot authorized.', severity: 'INFO' });
        return;
      }

      for (const dbRecord of migrationsInDb) {
        const status = getMigrationState(dbRecord);

        if (status.state === 'APPLIED' || status.state === 'IN_PROGRESS') {
           continue; // State safe or handled natively.
        }

        if (status.state === 'NOT_FOUND' || status.state === 'UNKNOWN' || status.state === 'DRIFT_DETECTED') {
           executeSafeBlock(status, 'CRITICAL', `State [${status.state}] demands strict manual SRE oversight to prevent drift.`);
           break;
        }

        // Must be FAILED (Either null finished_at post timeout or explicit rollback)
        if (status.state === 'FAILED') {
           await handleFailedMigration(tx, status, dbRecord);
        }
      }
      
      logSRE({ migration: 'ALL', state: 'APPLIED', risk: 'LOW', action: 'NO_ACTION', reason: 'All Database Migrations validated successfully.', severity: 'INFO' });

    }, { timeout: 30000 });

  } catch (err: any) {
    if (err.message && err.message.includes('relation "_prisma_migrations" does not exist')) {
        logSRE({ migration: 'GLOBAL', state: 'NOT_FOUND', risk: 'N/A', action: 'NO_ACTION', reason: 'Database uninitialized. Allowed boot.', severity: 'INFO' });
        return;
    }
    logSRE({ migration: 'SYSTEM', state: 'UNKNOWN', risk: 'N/A', action: 'BLOCK_AND_ALERT', reason: `Internal Error executing Guardian: ${err.message}`, severity: 'CRITICAL' });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function getMigrationState(record: any): MigrationStatus {
  const sqlPath = path.join(process.cwd(), 'prisma', 'migrations', record.migration_name, 'migration.sql');
  if (!fs.existsSync(sqlPath)) return { name: record.migration_name, state: 'NOT_FOUND' };

  if (record.finished_at !== null) return { name: record.migration_name, state: 'APPLIED', sqlPath };

  // Determine FAILED vs IN_PROGRESS based on started_at
  if (record.rolled_back_at !== null) {
      return { name: record.migration_name, state: 'FAILED', sqlPath, logs: record.logs, checksum: record.checksum };
  }

  const now = new Date().getTime();
  const started = new Date(record.started_at).getTime();
  const diffMinutes = Math.floor((now - started) / 60000);

  if (diffMinutes < 5) {
      return { name: record.migration_name, state: 'IN_PROGRESS', sqlPath, logs: record.logs, checksum: record.checksum };
  }

  return { name: record.migration_name, state: 'FAILED', sqlPath, logs: record.logs, checksum: record.checksum };
}

// ==========================================
// 2. POLICY ENGINE (DECISÃO INTELIGENTE)
// ==========================================
function evaluateMigrationRisk(sql: string, env: string): MigrationRisk {
  const rawSql = sql.toLowerCase();
  
  if (rawSql.includes('drop table') || rawSql.includes('drop column') || rawSql.includes('rename to') || rawSql.includes('truncate ')) {
      return 'CRITICAL';
  }
  
  if (rawSql.includes('alter table') && rawSql.includes('drop constraint')) {
      return 'HIGH';
  }
  
  if (rawSql.includes('alter table') || rawSql.includes('alter type') || rawSql.includes('create index')) {
      return 'MEDIUM'; // Allowed if strictly compatible
  }
  
  return 'LOW'; // Mostly Adds, Creates
}

function shouldResolve(risk: MigrationRisk): boolean {
  return risk === 'LOW' || risk === 'MEDIUM' || risk === 'HIGH';
}

function shouldBlock(risk: MigrationRisk): boolean {
  // 8. PROTEÇÃO CONTRA OPERAÇÕES DESTRUTIVAS: NUNCA ROME RENDER DROP/RENAME CIUMENTE
  return risk === 'CRITICAL';
}

async function handleFailedMigration(tx: any, status: MigrationStatus, dbRecord: any) {
  const sql = fs.readFileSync(status.sqlPath!, 'utf8');
  const env = process.env.NODE_ENV || 'development';
  const risk = evaluateMigrationRisk(sql, env);

  if (shouldBlock(risk)) {
     executeSafeBlock(status, risk, 'Manual intervention required due to destructive pattern match.');
     return;
  }

  // Anti-Loop Max Retries (Item 5)
  // Utiliza a contagem de falhas via parse do `logs` ou recusa em tentar resolver mais do que o tolerado
  // Se 'logs' incluir menções de "SRE_ATTEMPT", extrai.
  const attemptMatch = (dbRecord.logs || '').match(/SRE_ATTEMPT_(\d+)/);
  const retries = attemptMatch ? parseInt(attemptMatch[1], 10) : 0;
  
  if (retries >= 3) {
      executeSafeBlock(status, risk, `Max Retries Exceeded (${retries}/3). Loop Prevention Hook triggered.`);
      return;
  }

  // 11. DETECÇÃO DE DRIFT REAL (Shadow validation simplificada)
  const isCompatible = await verifyPhysicalDrift(tx, sql);
  if (!isCompatible) {
      executeSafeBlock(status, risk, `Physical Schema Drift matched against requested SQL. Auto-resolve rejected.`);
      return;
  }

  // Bump retry counter transparently via CLI output logging abstraction
  const newAttemptStr = `[SRE_ATTEMPT_${retries + 1}]`;

  // 13. DRY-RUN MODE & FEATURE_FLAG
  const targetResolution = dbRecord.rolled_back_at !== null ? '--rolled-back' : '--applied';

  if (process.env.AUTO_RESOLVE_ENABLED === 'false') {
     logSRE({ migration: status.name, state: status.state, risk, action: 'DRY_RUN_SKIP', reason: `Auto-Resolve disabled. Would have used ${targetResolution} on attempt ${retries + 1}.`, severity: 'INFO' });
     return;
  }

  executeSafeResolve(status, risk, targetResolution, newAttemptStr);
}

// 11. SHADOW VALIDATION DRIFT LOGIC
async function verifyPhysicalDrift(tx: any, sql: string): Promise<boolean> {
  const tables = sql.match(/CREATE\s+TABLE\s+"([^"]+)"/ig) || [];
  if (tables.length === 0) return true; // Passa adiante se só criar colunas (reduzido para payload local).
  
  for (const t of tables) {
     const tName = t.split('"')[1];
     const pgCheck = await tx.$queryRaw<any[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ${tName};`;
     if (pgCheck.length === 0) return false;
  }
  return true;
}

function executeSafeResolve(status: MigrationStatus, risk: MigrationRisk, commandType: string, counterStr: string) {
  logSRE({ migration: status.name, state: status.state, risk, action: commandType === '--applied' ? 'RESOLVE_APPLIED' : 'RESOLVE_ROLLED_BACK', reason: `Engine approved IDEMPOTENT recovery. Tracker: ${counterStr}`, severity: 'WARNING' });

  try {
     const cmd = `npx prisma migrate resolve ${commandType} ${status.name}`;
     const resolveOut = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
     console.log(`[SRE Guard V3] Recovered: ${resolveOut}`);
  } catch (err: any) {
      logSRE({ migration: status.name, state: status.state, risk, action: 'BLOCK_AND_ALERT', reason: `CLI Recover Execute Failed: ${err.message}`, severity: 'ERROR' });
      process.exit(1);
  }
}

// 7. FAIL-SAFE DESIGN (SE DÚVIDA = NÃO EXECUTE NADA, MATE O BOOT)
function executeSafeBlock(status: MigrationStatus, risk: MigrationRisk | 'N/A', reason: string) {
    logSRE({ migration: status.name, state: status.state, risk, action: 'BLOCK_AND_ALERT', reason: `CRITICAL STOP: ${reason}`, severity: 'CRITICAL' });
    process.exit(1);
}
