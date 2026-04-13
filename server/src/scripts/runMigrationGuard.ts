import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GuardStateSnapshot, updateGuardSnapshot } from '../utils/GuardStateSnapshot';

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

type V6Decision = 'PERMIT_BOOT' | 'BLOCK_BOOT' | 'WARN_ONLY';
type SafeMigrationState = 
  'SAFE' | 'IN_PROGRESS' | 'ROLLED_BACK' | 'CORRUPTED' | 
  'MISSING_IN_DB' | 'EXTRA_IN_DB' | 'CHECKSUM_MISMATCH' | 
  'OUT_OF_ORDER' | 'DUPLICATE_NAME' | 'INVALID_METADATA';

function generateChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
}

function evaluateV6Rules(
    migration: PrismaMigrationRecord | null, // DB Tracker
    localChecksum: string | null,            // File System
    strictExtra: boolean,
    strictChecksum: boolean
): { state: SafeMigrationState; decision: V6Decision; reason: string } {
    if (!migration && localChecksum) {
        return { state: 'MISSING_IN_DB', decision: 'WARN_ONLY', reason: 'Missing in DB (migrate deploy vai rodar ou já rodou e syncou).' };
    }
    if (migration && !localChecksum) {
        if (strictExtra) {
            return { state: 'EXTRA_IN_DB', decision: 'BLOCK_BOOT', reason: 'STRICT_EXTRA_DB_MIGRATIONS on. Migration no DB mas sem arquivo fisico.' };
        }
        return { state: 'EXTRA_IN_DB', decision: 'WARN_ONLY', reason: 'Extra in DB. File missing but strict flag off.' };
    }

    // From here, both exist.
    if (migration && localChecksum) {
        // metadata checks
        if (!/^\d{14}_.+/.test(migration.migration_name)) {
            return { state: 'INVALID_METADATA', decision: 'BLOCK_BOOT', reason: 'Migration não segue Regex d{14}_nome' };
        }

        if (migration.finished_at !== null && migration.rolled_back_at === null) {
            // Strict exact match comparison! Not `.includes()`
            if (migration.checksum !== localChecksum) {
                if (strictChecksum) {
                    return { state: 'CHECKSUM_MISMATCH', decision: 'BLOCK_BOOT', reason: 'Divergência SHA256 estrita no boot.' };
                }
                return { state: 'CHECKSUM_MISMATCH', decision: 'WARN_ONLY', reason: 'Divergência SHA256 permissiva.' };
            }
            return { state: 'SAFE', decision: 'PERMIT_BOOT', reason: 'Migration integra e resolvida (V6).' };
        }

        if (migration.finished_at === null && migration.rolled_back_at === null) {
            return { state: 'IN_PROGRESS', decision: 'BLOCK_BOOT', reason: 'Execução pendente ou travada em concorrência.' };
        }

        if (migration.rolled_back_at !== null) {
            return { state: 'ROLLED_BACK', decision: 'BLOCK_BOOT', reason: 'Migration corrompida foi revogada via resolve.' };
        }

        return { state: 'CORRUPTED', decision: 'BLOCK_BOOT', reason: 'Estado de tolerância fisicamente inaceitável.' };
    }

    return { state: 'INVALID_METADATA', decision: 'BLOCK_BOOT', reason: 'Unknown state logic bypass' };
}

function emitMetric(metric: string, value: number) {
    console.log(JSON.stringify({
        metric: metric,
        value: value,
        tags: ["env:production", "service:brasa-api", "guard_version:V6-OBSERVABLE-ZEROTRUST"]
    }));
}

async function startV6Engine(): Promise<void> {
    const STRICT_EXTRA_DB_MIGRATIONS = process.env.STRICT_EXTRA_DB_MIGRATIONS === 'true';
    const STRICT_CHECKSUM = process.env.STRICT_CHECKSUM === 'true';
    const MIGRATION_GUARD_WARN_THRESHOLD = parseInt(process.env.MIGRATION_GUARD_WARN_THRESHOLD || '3', 10);
    const MIGRATION_GUARD_RISK_THRESHOLD = parseInt(process.env.MIGRATION_GUARD_RISK_THRESHOLD || '5', 10);

    const bootId = crypto.randomUUID();

    const metrics = {
        safe_count: 0,
        warn_count: 0,
        block_count: 0,
        extra_in_db_count: 0,
        checksum_mismatch_count: 0,
        out_of_order_count: 0,
        risk_score: 0,
        warn_score: 0,
    };

    console.log("🚀 PrismaMigrationGuard VERSION: V6-OBSERVABLE-ZEROTRUST");
    console.log("BOOT_START");

    const prisma = new PrismaClient();
    try {
        const payload: PrismaMigrationRecord[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY started_at ASC`;
        const dbMap = new Map<string, PrismaMigrationRecord>();
        payload.forEach(row => dbMap.set(row.migration_name, row));

        let localMigrations: string[] = [];
        const migrationsPath = path.join(__dirname, '../../../prisma/migrations');
        if (fs.existsSync(migrationsPath)) {
            // Find valid folders that have a migration.sql file
            localMigrations = fs.readdirSync(migrationsPath).filter(d => fs.existsSync(path.join(migrationsPath, d, 'migration.sql')));
        }

        // Unique set of all migration names to evaluate
        const allMigrations = new Set([...localMigrations, ...dbMap.keys()]);
        let blockOccurred = false;

        const auditBulk: any[] = [];

        function auditLog(event: string, migration_name: string | null, state: SafeMigrationState | null, decision: V6Decision | null, dbRecord: PrismaMigrationRecord | null, localChecksum: string | null, reason: string) {
            const data = {
                guard_version: "V6-OBSERVABLE-ZEROTRUST",
                boot_id: bootId,
                environment: "production",
                event,
                migration_name,
                state_detected: state,
                decision,
                finished_at: dbRecord?.finished_at || null,
                rolled_back_at: dbRecord?.rolled_back_at || null,
                checksum_db: dbRecord?.checksum || null,
                checksum_local: localChecksum,
                reason
            };
            console.log(JSON.stringify(data));
            auditBulk.push(data);
        }

        let lastStartedAt = new Date(0);

        for (const dirName of allMigrations) {
            const sqlPath = path.join(migrationsPath, dirName, 'migration.sql');
            const localChecksum = localMigrations.includes(dirName) ? generateChecksum(sqlPath) : null;
            const dbRecord = dbMap.get(dirName) || null;

            const eq = evaluateV6Rules(dbRecord, localChecksum, STRICT_EXTRA_DB_MIGRATIONS, STRICT_CHECKSUM);

            // Anomaly tracking: OUT_OF_ORDER validation logic
            if (dbRecord && eq.decision === 'PERMIT_BOOT') {
                if (dbRecord.started_at < lastStartedAt) {
                    eq.state = 'OUT_OF_ORDER';
                    eq.decision = 'WARN_ONLY';
                    eq.reason = 'Started at data é anterior a uma migration pregressa no filesystem';
                } else {
                    lastStartedAt = dbRecord.started_at;
                }
            }

            auditLog("MIGRATION_EVALUATED", dirName, eq.state, eq.decision, dbRecord, localChecksum, eq.reason);

            // Metrics classification mapping
            if (eq.state === 'EXTRA_IN_DB') metrics.extra_in_db_count++;
            if (eq.state === 'CHECKSUM_MISMATCH') metrics.checksum_mismatch_count++;
            if (eq.state === 'OUT_OF_ORDER') metrics.out_of_order_count++;
            
            if (eq.decision === 'PERMIT_BOOT') {
                metrics.safe_count++;
            } else if (eq.decision === 'BLOCK_BOOT') {
                metrics.block_count++;
                metrics.risk_score += 2;
                blockOccurred = true;
                console.error(`🚨 [SRE BLOCK] ${dirName} is in BLOCK_BOOT criteria.`);
            } else if (eq.decision === 'WARN_ONLY') {
                metrics.warn_count++;
                metrics.warn_score += 1;
            }
        }

        let anomaly_detected = false;
        
        // Threshold validations
        if (metrics.warn_score >= MIGRATION_GUARD_WARN_THRESHOLD) {
             console.log(JSON.stringify({ event: 'ANOMALY_ALERT', reason: `warn_score ${metrics.warn_score} >= ${MIGRATION_GUARD_WARN_THRESHOLD}` }));
             anomaly_detected = true;
        }

        if (metrics.risk_score >= MIGRATION_GUARD_RISK_THRESHOLD) {
             console.log(JSON.stringify({ event: 'ANOMALY_ALERT', reason: `risk_score ${metrics.risk_score} >= ${MIGRATION_GUARD_RISK_THRESHOLD}` }));
             anomaly_detected = true;
             blockOccurred = true;
        }

        console.log("GUARD_SUMMARY");

        const finalDecision: 'PERMIT_BOOT' | 'BLOCK_BOOT' = blockOccurred ? 'BLOCK_BOOT' : 'PERMIT_BOOT';
        console.log(finalDecision);
        
        // Emit final global metrics
        emitMetric("migration_guard.safe_count", metrics.safe_count);
        emitMetric("migration_guard.warn_count", metrics.warn_count);
        emitMetric("migration_guard.block_count", metrics.block_count);
        emitMetric("migration_guard.extra_in_db_count", metrics.extra_in_db_count);
        emitMetric("migration_guard.checksum_mismatch_count", metrics.checksum_mismatch_count);
        emitMetric("migration_guard.out_of_order_count", metrics.out_of_order_count);
        emitMetric("migration_guard.risk_score", metrics.risk_score);
        emitMetric("migration_guard.warn_score", metrics.warn_score);
        emitMetric("migration_guard.boot_permitted", finalDecision === 'PERMIT_BOOT' ? 1 : 0);
        emitMetric("migration_guard.boot_blocked", finalDecision === 'BLOCK_BOOT' ? 1 : 0);

        updateGuardSnapshot({
            decision: finalDecision,
            ...metrics,
            anomaly_detected,
            last_boot_at: new Date().toISOString()
        });

        // Best effort Audit write
        try {
            // Write each log directly, fire-and-forget in case db fails
            await prisma.migrationGuardAuditLog.createMany({
                data: auditBulk,
                skipDuplicates: true
            });
            await prisma.migrationGuardAuditLog.create({
                data: {
                    guard_version: "V6-OBSERVABLE-ZEROTRUST",
                    boot_id: bootId,
                    environment: "production",
                    event: finalDecision,
                    reason: `Final check: blockOccurred=${blockOccurred}`
                }
            });
        } catch (auditErr: any) {
            console.log(JSON.stringify({ event: 'WARN_ONLY', reason: 'Audit Database Write Failed Best-Effort', details: auditErr.message }));
        }

        await prisma.$disconnect();
        process.exit(blockOccurred ? 1 : 0);
        
    } catch (error: any) {
        console.error("🚨 [SRE FATAL ERROR] Erro conectando ao prisma engine", error.message);
        console.log("BOOT_BLOCKED");
        emitMetric("migration_guard.boot_blocked", 1);
        await prisma.$disconnect();
        process.exit(1);
    }
}

startV6Engine();
