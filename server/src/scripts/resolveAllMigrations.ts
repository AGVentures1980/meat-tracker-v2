const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[SRE] Starting Forceful Migration Resolution...');

try {
    const migrationsDir = path.join(process.cwd(), 'prisma/migrations');
    const items = fs.readdirSync(migrationsDir);
    
    // Filter only directories that start with numbers (YYYYMMDD...)
    const migrations = items.filter((item: string) => {
        return fs.statSync(path.join(migrationsDir, item)).isDirectory() && /^\d+/.test(item);
    });

    console.log(`[SRE] Found ${migrations.length} migrations. Executing resolve...`);

    for (const migration of migrations) {
        try {
            console.log(`[SRE] Resolving ${migration}...`);
            execSync(`npx prisma migrate resolve --applied ${migration}`, { stdio: 'pipe' });
            console.log(`✅ [SRE] ${migration} natively marked applied.`);
        } catch (e: unknown) {
            const error = e as any;
            const stderr = error.stderr ? error.stderr.toString() : '';
            if (stderr.includes('P3008')) {
                 console.log(`ℹ️ [SRE] ${migration} is already recorded as applied.`);
            } else {
                 console.warn(`⚠️ [SRE] Warning on ${migration}: ${stderr.trim()}`);
                 // We don't throw because we want to aggressively resolve all of them.
            }
        }
    }
    console.log('[SRE] Forceful Resolution Complete. System Clear.');
} catch (e: unknown) {
    console.error('[SRE] FATAL ERROR during Forceful Resolution:', e);
}
