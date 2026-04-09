const { PrismaClient } = require('@prisma/client');

async function cleanAuditLogs() {
    console.log("[SRE] Initiating pre-migration orphaned AuditLog cleanup...");
    
    if (!process.env.DATABASE_URL) {
        console.log("[SRE] DATABASE_URL missing during build phase. Skipping cleanup.");
        process.exit(0);
    }

    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        const result = await prisma.$executeRawUnsafe(`
            DELETE FROM "AuditLog" 
            WHERE user_id IS NOT NULL 
            AND user_id NOT IN (SELECT id FROM "User");
        `);
        console.log(`[SRE] Cleaned up ${result} orphaned AuditLogs successfully.`);
    } catch(err) {
        console.warn("[SRE] Clean audit logs skipped or failed:", err.message);
    } finally {
        try { await prisma.$disconnect(); } catch (e) {}
        process.exit(0);
    }
}

cleanAuditLogs();
