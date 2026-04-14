import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined
};

export const intakeQueue = new Queue('data-intake', { connection });

export const intakeWorker = new Worker('data-intake', async (job: Job) => {
    const { itemId, outboxId } = job.data;
    
    // Enterprise SRE Idempotency Guard (Phase 4.3): 
    // Always check state directly from DB before generating Side-Effects
    const item = await prisma.goldenDatasetItem.findUnique({ where: { id: itemId } });
    if (!item) {
        throw new Error("SRE: GoldenDatasetItem No Longer Exists - Poison Job");
    }

    if (['VALIDATED', 'QUARANTINED', 'REJECTED', 'COMPLETED'].includes(item.status)) {
        console.warn(`[WORKER-IDEMPOTENCY] Job ${job.id} / Item ${itemId} already resolved as ${item.status}. NO-OP Drop.`);
        return { status: 'NO_OP', message: "Dropped by SRE Idempotency Barrier" };
    }

    // Acknowledge Start of Work
    await prisma.$transaction(async (tx) => {
        await tx.intakeJob.upsert({
            where: { dataset_item_id: itemId },
            update: { attempts: job.attemptsMade + 1, updated_at: new Date() },
            create: { dataset_item_id: itemId, attempts: 1, error_message: null, worker_id: intakeWorker.id }
        });
        
        await tx.goldenDatasetItem.update({
            where: { id: itemId },
            data: { status: 'PROCESSING' }
        });
    });

    // Simulated Intensive Work Delay (OCR, AI Matching, File Sync)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulating deterministic failure based on item data (for testing Retry Storm)
    if (job.data.tenant_id === 'simulated-failure-tenant') {
        throw new Error("SIMULATED_WORKER_CRASH");
    }

    try {
        await prisma.goldenDatasetItem.update({
            where: { id: itemId },
            data: { 
                status: 'VALIDATED', 
                parsed_output: { msg: 'parsed' }, 
                normalized_output: { msg: 'normalized' },
                validation_output: { msg: 'success' },
                processed_at: new Date()
            }
        });
    } catch(e: any) {
        // Known Domain Failures
        await prisma.goldenDatasetItem.update({
            where: { id: itemId },
            data: { 
                status: 'QUARANTINED', 
                quarantine_cause: 'NORMALIZATION_FAILURE',
                quarantine_details: { error: e.message }
            }
        });
        throw e;
    }
}, { connection, concurrency: parseInt(process.env.WORKER_CONCURRENCY || '10') });

// Phase 4.4 DLQ (Dead Letter Queue) Event Hooks
intakeWorker.on('failed', async (job: Job | undefined, err: Error) => {
    if (!job) return;
    
    console.error(`[Worker DLQ Alert] Job ${job.id} Failed. Attempts: ${job.attemptsMade}. Reason: ${err.message}`);
    
    await prisma.intakeJob.updateMany({
        where: { dataset_item_id: job.data.itemId },
        data: { error_message: err.message, updated_at: new Date() }
    });
    
    // Dead Letter Policy Enforcement
    if (job.attemptsMade >= 3 || job.opts.attempts === job.attemptsMade) {
        await prisma.goldenDatasetItem.updateMany({
            where: { id: job.data.itemId, status: { notIn: ['VALIDATED', 'QUARANTINED'] } },
            data: { 
                status: 'REJECTED', // Formally Dead-Lettered
                validation_notes: `DLQ_AUTO_REJECT: Maximum Retries Exceeded. Last Error: ${err.message}` 
            }
        });
        console.warn(`[DLQ] Item ${job.data.itemId} permanently rejected (DLQ)`);
    } else {
        // Revert to QUEUED to allow graceful visualizer for next worker retry
        await prisma.goldenDatasetItem.updateMany({
            where: { id: job.data.itemId, status: 'PROCESSING' },
            data: { status: 'QUEUED' }
        });
    }
});
