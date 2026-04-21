import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runAuditLogArchival = async () => {
    console.log('[ARCHIVAL JOB] Starting AuditLog archival process...');

    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Fetch logs older than 90 days
        const oldLogs = await prisma.auditLog.findMany({
            where: {
                created_at: { lt: ninetyDaysAgo }
            },
            take: 5000 // Process in chunks to prevent memory bloat
        });

        if (oldLogs.length === 0) {
            console.log('[ARCHIVAL JOB] No logs to archive right now.');
            return;
        }

        console.log(`[ARCHIVAL JOB] Found ${oldLogs.length} logs to archive. Proceeding...`);

        // Transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            const archiveData = oldLogs.map(log => ({
                id: log.id,
                company_id: log.company_id,
                store_id: log.store_id,
                user_id: log.user_id,
                action: log.action,
                resource: log.resource,
                reason: log.reason,
                details: log.details ? JSON.parse(JSON.stringify(log.details)) : null,
                created_at: log.created_at,
                ip_address: log.ip_address,
                location: log.location,
                target_lbs_guest: log.target_lbs_guest
            }));

            // Insert into Archive
            await tx.auditLogArchive.createMany({
                data: archiveData,
                skipDuplicates: true
            });

            // Delete from main table
            const idsToDelete = oldLogs.map(log => log.id);
            await tx.auditLog.deleteMany({
                where: {
                    id: { in: idsToDelete }
                }
            });
        });

        console.log(`[ARCHIVAL JOB] Successfully archived ${oldLogs.length} logs.`);
    } catch (error) {
        console.error('[ARCHIVAL JOB] Failed during archival process:', error);
    } finally {
        await prisma.$disconnect();
    }
};

// If run directly via node
if (require.main === module) {
    runAuditLogArchival();
}
