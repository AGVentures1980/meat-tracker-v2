const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAuditLogs() {
    console.log("[SRE] Initiating pre-migration orphaned AuditLog cleanup...");
    try {
        await prisma.$connect();
        const result = await prisma.$executeRawUnsafe(`
            DELETE FROM "AuditLog" 
            WHERE user_id IS NOT NULL 
            AND user_id NOT IN (SELECT id FROM "User");
        `);
        console.log(`[SRE] Cleaned up ${result} orphaned AuditLogs successfully.`);
    } catch(err) {
        console.error("[SRE] Clean audit logs skipped or failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

cleanAuditLogs();
