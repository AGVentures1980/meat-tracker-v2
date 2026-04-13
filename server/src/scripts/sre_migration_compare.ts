import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function runCompare() {
    console.log("[SRE] Executing Filesystem vs DB Migration Sync Comparison...");

    try {
        const migrationsPath = path.join(process.cwd(), 'prisma/migrations');
        
        let localMigrations: string[] = [];
        if (fs.existsSync(migrationsPath)) {
            localMigrations = fs.readdirSync(migrationsPath).filter(d => fs.existsSync(path.join(migrationsPath, d, 'migration.sql')));
        }

        const payload: any[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY started_at ASC`;
        const dbMap = new Map<string, any>();
        payload.forEach(row => dbMap.set(row.migration_name, row));

        const allMigrations = new Set([...localMigrations, ...dbMap.keys()]);
        
        const anomalies: string[] = [];
        let warnCount = 0;
        let criticalCount = 0;

        for (const mName of allMigrations) {
            const inDb = dbMap.has(mName);
            const inFs = localMigrations.includes(mName);

            if (inDb && !inFs) {
                anomalies.push(`[EXTRA_IN_DB] ${mName}`);
                warnCount++;
                continue;
            }

            if (inFs && !inDb) {
                anomalies.push(`[MISSING_IN_DB] ${mName}`);
                // MISSING_IN_DB is generally safe, it means deploy hasn't run yet.
                continue;
            }

            // Both exist
            const dbRecord = dbMap.get(mName);
            if (dbRecord.finished_at !== null && dbRecord.rolled_back_at === null) {
                const sqlPath = path.join(migrationsPath, mName, 'migration.sql');
                const fsChecksum = generateChecksum(sqlPath);
                
                if (dbRecord.checksum !== fsChecksum) {
                    anomalies.push(`[CHECKSUM_MISMATCH] ${mName} (DB: ${dbRecord.checksum} | FS: ${fsChecksum})`);
                    criticalCount++;
                }
            }
        }

        if (anomalies.length > 0) {
            console.log("\n⚠️ SRE Compare Anomalies Found:");
            anomalies.forEach(a => console.log(`  ${a}`));
            console.log();
        } else {
            console.log("✅ FS and DB are perfectly synchronized.\n");
        }

        await prisma.$disconnect();

        let calculatedExitCode = 0;
        if (criticalCount > 0) {
             calculatedExitCode = 2;
        } else if (warnCount > 0 && process.env.STRICT_EXTRA_DB_MIGRATIONS === 'true') {
             calculatedExitCode = 1;
        }

        const SRE_BLOCK = process.env.SRE_BLOCK === "true";
        const effectiveExitCode = SRE_BLOCK ? calculatedExitCode : 0;

        console.log(JSON.stringify({
            event: "SRE_SCRIPT_EXIT_POLICY",
            script: "sre_migration_compare",
            sre_block: SRE_BLOCK,
            calculated_exit_code: calculatedExitCode,
            effective_exit_code: effectiveExitCode,
            reason: SRE_BLOCK ? "strict_isolation_active" : "report_only_mode"
        }));

        process.exit(effectiveExitCode);
    } catch (e: any) {
         console.error("[SRE FATAL] Failed to compare schema states.", e.message);
         await prisma.$disconnect();
         process.exit(2);
    }
}

runCompare();
