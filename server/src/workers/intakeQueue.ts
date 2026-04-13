import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure Redis Connection String
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined
};

export const intakeQueue = new Queue('data-intake', { connection });

export const intakeWorker = new Worker('data-intake', async (job: Job) => {
    const { itemId } = job.data;
    
    // Simulate updating job state
    await prisma.intakeJob.upsert({
        where: { dataset_item_id: itemId },
        update: { attempts: job.attemptsMade + 1 },
        create: { dataset_item_id: itemId, attempts: 1, error_message: null, worker_id: intakeWorker.id }
    });
    
    await prisma.goldenDatasetItem.update({
        where: { id: itemId },
        data: { status: 'PROCESSING' }
    });

    // Simulated Work Delay for Phase 2 Implementation Target 
    // This allows exact tracking of QUEUED -> PROCESSING -> VALIDATED
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
}, { connection });

intakeWorker.on('failed', async (job: Job | undefined, err: Error) => {
    if (job) {
        await prisma.intakeJob.updateMany({
            where: { dataset_item_id: job.data.itemId },
            data: { error_message: err.message }
        });
        await prisma.goldenDatasetItem.updateMany({
            where: { id: job.data.itemId },
            data: { status: 'REJECTED' }
        });
    }
});
