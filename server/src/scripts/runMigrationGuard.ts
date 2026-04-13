import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface PrismaMigrationRecord {
  id: string;
  checksum: string;
  finished_at: Date | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date;
  applied_steps_count: number;
}

type V5Decision = 'PERMIT_BOOT' | 'BLOCK_BOOT' | 'WARN_ONLY';
type SafeMigrationState = 'SAFE' | 'IN_PROGRESS' | 'ROLLED_BACK' | 'CORRUPTED' | 'MISSING_IN_DB';

function generateChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
}

function evaluateV5Rules(
    migration: PrismaMigrationRecord | null,
    localChecksum: string | null
): { state: SafeMigrationState; decision: V5Decision; reason: string } {
    if (!migration) {
        return { state: 'MISSING_IN_DB', decision: 'WARN_ONLY', reason: 'Missing in DB (migrate deploy vai rodar ou já rodou e syncou).' };
    }

    if (migration.finished_at !== null && migration.rolled_back_at === null) {
        if (localChecksum && migration.checksum !== localChecksum && !migration.checksum.includes(localChecksum)) {
            return { state: 'SAFE', decision: 'WARN_ONLY', reason: 'Checksum diverge mas status fisico é Seguro.' };
        }
        return { state: 'SAFE', decision: 'PERMIT_BOOT', reason: 'Migration integra e resolvida.' };
    }

    if (migration.finished_at === null && migration.rolled_back_at === null) {
        return { state: 'IN_PROGRESS', decision: 'BLOCK_BOOT', reason: 'Execução pendente ou travada em concorrência.' };
    }

    if (migration.rolled_back_at !== null) {
        return { state: 'ROLLED_BACK', decision: 'BLOCK_BOOT', reason: 'Migration corrompida foi revogada via resolve.' };
    }

    return { state: 'CORRUPTED', decision: 'BLOCK_BOOT', reason: 'Estado de tolerância fisicamente inaceitável.' };
}

async function startV5Engine(): Promise<void> {
    console.log("🚀 PrismaMigrationGuard VERSION: V5-STRICT-DETERMINISTIC");
    console.log("BOOT_START");

    const prisma = new PrismaClient();
    try {
        const payload: PrismaMigrationRecord[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY started_at ASC`;
        const dbMap = new Map<string, PrismaMigrationRecord>();
        payload.forEach(row => dbMap.set(row.migration_name, row));

        let blockOccurred = false;

        const migrationsPath = path.join(__dirname, '../../../prisma/migrations');
        let localMigrations: string[] = [];
        if (fs.existsSync(migrationsPath)) {
            localMigrations = fs.readdirSync(migrationsPath).filter(d => fs.existsSync(path.join(migrationsPath, d, 'migration.sql')));
        }

        // Validate local structural definitions against the reality of the database tracker
        for (const dirName of localMigrations) {
            const sqlPath = path.join(migrationsPath, dirName, 'migration.sql');
            const localChecksum = generateChecksum(sqlPath);
            const dbRecord = dbMap.get(dirName) || null;

            const eq = evaluateV5Rules(dbRecord, localChecksum);

            const auditLog = {
                guard_version: "V5-STRICT-DETERMINISTIC",
                event: "MIGRATION_EVALUATED",
                migration_name: dirName,
                state_detected: eq.state,
                decision: eq.decision,
                finished_at: dbRecord?.finished_at || null,
                rolled_back_at: dbRecord?.rolled_back_at || null,
                checksum_db: dbRecord?.checksum || null,
                checksum_local: localChecksum,
                reason: eq.reason
            };

            console.log(JSON.stringify(auditLog));

            if (eq.decision === 'BLOCK_BOOT') {
                blockOccurred = true;
                console.error(`🚨 [SRE BLOCK] ${dirName} is in BLOCK_BOOT criteria.`);
            }
        }

        // Validate any orphaned DB migrations that do not exist locally
        for (const [dbName, dbRecord] of dbMap.entries()) {
            if (!localMigrations.includes(dbName)) {
                const eq = evaluateV5Rules(dbRecord, null);
                if (eq.decision === 'BLOCK_BOOT') {
                    blockOccurred = true;
                    console.error(`🚨 [SRE BLOCK] Orphaned DB tracker ${dbName} is active and BLOCK_BOOT.`);
                }
            }
        }

        console.log("GUARD_SUMMARY");
        
        if (blockOccurred) {
            console.log("BOOT_BLOCKED");
            await prisma.$disconnect();
            process.exit(1);
        } else {
            console.log("BOOT_PERMITTED");
            await prisma.$disconnect();
            process.exit(0);
        }

    } catch (error: any) {
        console.error("🚨 [SRE FATAL ERROR] Erro conectando ao prisma engine", error.message);
        console.log("BOOT_BLOCKED");
        await prisma.$disconnect();
        process.exit(1);
    }
}

startV5Engine();
