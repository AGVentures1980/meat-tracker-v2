import { PrismaClient } from '@prisma/client';

interface AuditResult {
    status: 'SAFE' | 'WARN' | 'CRITICAL';
    migrationGroups: {
        safe: string[];
        in_progress: string[];
        rolled_back: string[];
        corrupted: string[];
    };
    total: number;
}

const prisma = new PrismaClient();

async function runAudit() {
    console.log("[SRE] Executing Read-Only Database Migration Audit...");
    const jsonMode = process.argv.includes('--json');

    try {
        const payload: any[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY started_at ASC`;
        
        const audit: AuditResult = {
            status: 'SAFE',
            migrationGroups: {
                safe: [],
                in_progress: [],
                rolled_back: [],
                corrupted: []
            },
            total: payload.length
        };

        for (const row of payload) {
            const name = row.migration_name;
            if (row.finished_at !== null && row.rolled_back_at === null) {
                audit.migrationGroups.safe.push(name);
            } else if (row.finished_at === null && row.rolled_back_at === null) {
                audit.migrationGroups.in_progress.push(name);
            } else if (row.rolled_back_at !== null) {
                audit.migrationGroups.rolled_back.push(name);
            } else {
                audit.migrationGroups.corrupted.push(name);
            }
        }

        let exitCode = 0;

        if (audit.migrationGroups.in_progress.length > 0) {
            audit.status = process.env.STRICT_AUDIT === 'true' ? 'CRITICAL' : 'WARN';
            exitCode = process.env.STRICT_AUDIT === 'true' ? 2 : 1;
        }

        if (audit.migrationGroups.rolled_back.length > 0 || audit.migrationGroups.corrupted.length > 0) {
            audit.status = 'CRITICAL';
            exitCode = 2;
        }

        if (jsonMode) {
            console.log(JSON.stringify(audit, null, 2));
        } else {
            console.log(`\n=== SRE AUDIT REPORT ===`);
            console.log(`STATUS: ${audit.status}`);
            console.log(`TOTAL MIGRATIONS: ${audit.total}`);
            console.log(`------------------------`);
            console.log(`SAFE: ${audit.migrationGroups.safe.length}`);
            console.log(`IN_PROGRESS: ${audit.migrationGroups.in_progress.length}`);
            console.log(`ROLLED_BACK: ${audit.migrationGroups.rolled_back.length}`);
            console.log(`CORRUPTED: ${audit.migrationGroups.corrupted.length}`);
            
            if (exitCode !== 0) {
                console.log(`\n🚨 ABNORMAL MIGRATIONS DETECTED:`);
                audit.migrationGroups.in_progress.forEach(m => console.log(` - [IN_PROGRESS] ${m}`));
                audit.migrationGroups.rolled_back.forEach(m => console.log(` - [ROLLED_BACK] ${m}`));
                audit.migrationGroups.corrupted.forEach(m => console.log(` - [CORRUPTED]   ${m}`));
            }
            console.log(`========================\n`);
        }

        await prisma.$disconnect();
        
        const SRE_BLOCK = process.env.SRE_BLOCK === "true";
        const effectiveExitCode = SRE_BLOCK ? exitCode : 0;
        
        console.log(JSON.stringify({
            event: "SRE_SCRIPT_EXIT_POLICY",
            script: "sre_migration_audit",
            sre_block: SRE_BLOCK,
            calculated_exit_code: exitCode,
            effective_exit_code: effectiveExitCode,
            reason: SRE_BLOCK ? "strict_isolation_active" : "report_only_mode"
        }));

        process.exit(effectiveExitCode);
    } catch (e: any) {
        if (jsonMode) {
            console.log(JSON.stringify({ error: e.message, status: 'CRITICAL' }));
        } else {
            console.error("[SRE FATAL] Failed to audit database.", e.message);
        }
        await prisma.$disconnect();
        process.exit(2);
    }
}

runAudit();
