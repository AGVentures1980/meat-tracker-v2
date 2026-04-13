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
  | 'SAFE' 
  | 'BLOCK' 
  | 'IN_PROGRESS';

function evaluateMigrationTolerances(migration: PrismaMigrationRecord): SafeMigrationState {
  // A migration is strictly valid only if it has successfully finished and never rolled back.
  if (migration.finished_at !== null && migration.rolled_back_at === null) {
      return 'SAFE';
  }
  // If it hasn't finished and hasn't rolled back, it might be actively running in another container
  if (migration.finished_at === null && migration.rolled_back_at === null) {
      return 'IN_PROGRESS';
  }
  // Any other combination (rolled back, partially failed, etc) means it failed structurally
  return 'BLOCK';
}

function internalSysLog(log: any) {
  console.log(`✅ [SRE-GUARD-INFO] ${JSON.stringify(log)}`);
}

export async function safeMigrationGuardEngine(prisma: PrismaClient): Promise<void> {
  internalSysLog({ 
     migration: 'SYSTEM', state: 'BOOTING', risk: 'N/A', action: 'NO_ACTION', 
     reason: 'PrismaMigrationGuard V5 Boot Gate ativado em estrito check pós-deploy.', severity: 'INFO' 
  });

  const payload: PrismaMigrationRecord[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY started_at ASC`;
  if (!payload || payload.length === 0) return;

  for (const row of payload) {
    const status = evaluateMigrationTolerances(row);

    if (status === 'SAFE') {
        internalSysLog({
            migration_name: row.migration_name,
            state_detected: 'SAFE',
            finished_at: row.finished_at,
            rolled_back_at: row.rolled_back_at,
            decision: 'permit'
        });
        continue;
    }

    if (status === 'IN_PROGRESS') {
        internalSysLog({
            migration_name: row.migration_name,
            state_detected: 'IN_PROGRESS',
            finished_at: row.finished_at,
            rolled_back_at: row.rolled_back_at,
            decision: 'skip'
        });
        continue;
    }

    if (status === 'BLOCK') {
       internalSysLog({
           migration_name: row.migration_name,
           state_detected: 'BLOCK',
           finished_at: row.finished_at,
           rolled_back_at: row.rolled_back_at,
           decision: 'halt'
       });
       throw new Error(`[SRE BLOCK] Migration estruturalmente falha detectada: ${row.migration_name}. Intervenção manual obrigatória.`);
    }
  }
}
