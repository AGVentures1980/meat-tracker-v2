import { PrismaClient } from '@prisma/client';

export interface PrismaMigrationRecord {
  id: string;
  checksum: string;
  finished_at: Date | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date;
  applied_steps_count: number;
}

export type SafeMigrationState = 
  | 'APPLIED' 
  | 'IN_PROGRESS' 
  | 'FAILED' 
  | 'PARTIAL_FAILED' 
  | 'PARTIAL_FAILED_DESTRUCTIVE'
  | 'DRIFT_DETECTED'
  | 'UNKNOWN';

function evaluateMigrationTolerances(migration: PrismaMigrationRecord): SafeMigrationState {
  if (migration.finished_at && !migration.rolled_back_at) return 'APPLIED';
  if (!migration.finished_at && !migration.rolled_back_at) return 'IN_PROGRESS';
  if (!migration.finished_at && migration.rolled_back_at) {
      if (migration.applied_steps_count > 0) return 'PARTIAL_FAILED';
      return 'FAILED';
  }
  return 'UNKNOWN';
}

function internalSysLog(log: any) {
  console.log(`✅ [SRE-GUARD-INFO] ${JSON.stringify(log)}`);
}

export async function safeMigrationGuardEngine(prisma: PrismaClient): Promise<void> {
  internalSysLog({ 
     migration: 'SYSTEM', state: 'BOOTING', risk: 'N/A', action: 'NO_ACTION', 
     reason: 'PrismaMigrationGuard V4 Boot Gate ativado em estrito check.', severity: 'INFO' 
  });

  const payload: PrismaMigrationRecord[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY started_at ASC`;
  if (!payload || payload.length === 0) return;

  for (const row of payload) {
    const status = evaluateMigrationTolerances(row);

    if (status === 'APPLIED') continue;

    if (status === 'IN_PROGRESS') {
        internalSysLog({
           migration: row.migration_name, state: 'IN_PROGRESS', risk: 'LOW', action: 'SKIP', 
           reason: 'Boot SRE detectou transação concorrente sem falha e desviou bloqueio.', severity: 'INFO'
        });
        continue;
    }

    if (status === 'FAILED' || status === 'PARTIAL_FAILED' || status === 'PARTIAL_FAILED_DESTRUCTIVE') {
       const alarm = `🚨 [SRE FATAL] Boot Gateway detectou restrição insuperável. Migration falha ativa: ${row.migration_name} State: ${status}`;
       throw new Error(alarm);
    }
  }
}
