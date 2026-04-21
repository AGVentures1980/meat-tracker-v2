import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export const runAuditLogArchival = async () => {
    // -------------------------------------------------------------
    // DISTRIBUTED LOCK (Token Ownership & Safe Release)
    // Prevents cross-instance unlocking if lease expires.
    // -------------------------------------------------------------
    const instanceToken = randomUUID();
    let lockAcquiredValue: string | null = null;

    try {
        await prisma.systemSettings.upsert({
            where: { key: 'CRON_LOCK_ARCHIVE_JOB' },
            create: { key: 'CRON_LOCK_ARCHIVE_JOB', value: '0', type: 'lock' },
            update: {}
        });

        const nowMs = Date.now();
        // 10 minutes lease (generous envelope for batch loops)
        const expiresAtMs = nowMs + 10 * 60000; 
        
        // Zero-padding allows safe native string-based math comparison in Postgres
        const nowPadded = nowMs.toString().padStart(20, '0');
        const expiresPadded = expiresAtMs.toString().padStart(20, '0');
        
        const lockValueToWrite = `${expiresPadded}_${instanceToken}`;

        // Atomic Lease Claim with prefix-compatible String sort comparison
        const lockClaim = await prisma.systemSettings.updateMany({
            where: { 
                key: 'CRON_LOCK_ARCHIVE_JOB', 
                OR: [
                    { value: '0' },
                    { value: { lt: nowPadded } } // Lexicographical sort perfectly matches zero-padded numbers
                ]
            },
            data: { value: lockValueToWrite }
        });

        if (lockClaim.count === 0) {
            console.log('[ARCHIVAL-JOB] Lock active (another replica holds unexpired lease).');
            return;
        }

        // Successfully locked
        lockAcquiredValue = lockValueToWrite;
    } catch (e) {
        console.error('[ARCHIVAL-JOB] Failed to acquire distributed lock. Aborting safe run.', e);
        return;
    }

    // -------------------------------------------------------------
    // ARCHIVAL ENGINE 
    // -------------------------------------------------------------
    const days = parseInt(process.env.AUDITLOG_ARCHIVE_AFTER_DAYS || '90', 10);
    const batchSize = parseInt(process.env.AUDITLOG_ARCHIVE_BATCH_SIZE || '5000', 10);
    
    console.log(`[ARCHIVAL-JOB] Booting... Target: >${days} days. Batch Limit: ${batchSize}.`);
    const startTime = Date.now();

    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);

        const oldLogs = await prisma.auditLog.findMany({
            where: { created_at: { lt: thresholdDate } },
            take: batchSize,
            orderBy: { created_at: 'asc' }
        });

        if (oldLogs.length === 0) {
            console.log('[ARCHIVAL-JOB] OK - No logs eligible for archival.');
            return;
        }

        console.log(`[ARCHIVAL-JOB] Found ${oldLogs.length} eligible logs. Executing atomic transier...`);

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

            const insertResult = await tx.auditLogArchive.createMany({
                data: archiveData,
                skipDuplicates: true
            });

            const idsToDelete = oldLogs.map(log => log.id);
            const deleteResult = await tx.auditLog.deleteMany({
                where: { id: { in: idsToDelete } }
            });

            if (deleteResult.count > oldLogs.length) {
                throw new Error(`[ARCHIVAL-JOB] CRITICAL: Transaction aborted. Delete count (${deleteResult.count}) exceeded extraction count (${oldLogs.length}).`);
            }

            console.log(`[ARCHIVAL-JOB] BATCH COMMIT OK | Inserted: ${insertResult.count} | Deleted: ${deleteResult.count} | Skipped Dups: ${oldLogs.length - insertResult.count}`);
        });

        const durationStr = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[ARCHIVAL-JOB] Finished batch in ${durationStr}s.`);
        
    } catch (error) {
        console.error('[ARCHIVAL-JOB] FAILURE - Exception occurred during batch transaction.', error);
        throw error;
    } finally {
        // Safe Release Logic: ONLY release if we still mathematically own the exact lock we acquired
        if (lockAcquiredValue) {
            try {
                const release = await prisma.systemSettings.updateMany({
                    where: { 
                        key: 'CRON_LOCK_ARCHIVE_JOB',
                        value: lockAcquiredValue // Strict exact match prevents cross-instance unlock
                    },
                    data: { value: '0' }
                });
                if (release.count > 0) {
                    console.log('[ARCHIVAL-JOB] Distributed lock released safely by owner.');
                } else {
                    console.warn('[ARCHIVAL-JOB] Lock expired before release! Another instance may have taken over.');
                }
            } catch (e) {
                console.error('[ARCHIVAL-JOB] Failed to release lock. It will expire natively.', e);
            }
        }
        await prisma.$disconnect();
    }
};

// Auto-execution support
if (require.main === module) {
    runAuditLogArchival().catch(err => {
        console.error("[ARCHIVAL-JOB] FATAL", err);
        process.exit(1);
    });
}
