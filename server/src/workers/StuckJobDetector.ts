import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function detectStuckJobs() {
    if (process.env.ENABLE_STUCK_JOB_DETECTOR !== 'true') {
        return;
    }

    try {
        // Atomic Sweep isolated entirely inside the database layer
        const sweptItems = await prisma.$queryRaw<{ id: string, tenant_id: string }[]>`
            UPDATE "GoldenDatasetItem" 
            SET status = 'REJECTED', validation_notes = 'DLQ_AUTO_REJECT: Job Stuck in PROCESSING timeout'
            WHERE status = 'PROCESSING' 
            AND updated_at < NOW() - INTERVAL '15 minutes'
            RETURNING id, tenant_id;
        `;

        if (sweptItems.length === 0) return;

        console.error(`[SRE ALERT] Sweeper atomically reaped ${sweptItems.length} STUCK JOBS.`);

        // Audit Trail generation for newly mapped rejections 
        const auditPayloads = sweptItems.map(item => ({
             correlation_id: `STUCK_RECOVERY_${item.id}_${Date.now()}`,
             actor_user_id: 'SYSTEM_SRE',
             actor_role: 'SYSTEM',
             action: 'STUCK_JOB_DLQ_REJECTED',
             target_resource: 'STUCK_JOB_SWEEPER',
             effective_scope: item.tenant_id,
             fingerprint: 'SWEEPER_DAEMON',
             result_status: 'FAILED'
        }));

        if (auditPayloads.length > 0) {
            await prisma.intakeAudit.createMany({ data: auditPayloads, skipDuplicates: true });
        }

    } catch (e) {
        console.error("[StuckJobDetector] Failed to sweep stuck jobs:", e);
    }
}

const INTERVAL = 5 * 60 * 1000;
setInterval(detectStuckJobs, INTERVAL);
