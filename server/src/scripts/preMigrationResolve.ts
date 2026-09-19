import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('[PreMigrationResolve] Checking for stuck or failed migrations in _prisma_migrations...');
    const prisma = new PrismaClient();
    try {
        const failed: any[] = await prisma.$queryRaw`
            SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL
        `;
        if (failed && failed.length > 0) {
            for (const f of failed) {
                console.log(`[PreMigrationResolve] Unlocking failed/stuck migration: ${f.migration_name}`);
            }
            await prisma.$executeRaw`
                UPDATE "_prisma_migrations" 
                SET rolled_back_at = NOW() 
                WHERE finished_at IS NULL AND rolled_back_at IS NULL
            `;
            console.log('[PreMigrationResolve] Rolled back stuck migrations so Prisma migrate deploy can re-run them cleanly.');
        } else {
            console.log('[PreMigrationResolve] No stuck migrations found.');
        }
    } catch (err: any) {
        console.warn('[PreMigrationResolve] Warning during pre-migration recovery check:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(err => {
    console.error('[PreMigrationResolve] Fatal error:', err);
    process.exit(0); // Fail open so pre-start check never blocks initial schema creation
});
