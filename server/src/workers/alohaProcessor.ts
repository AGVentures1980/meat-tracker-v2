import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const hasRedis = !!process.env.REDIS_URL;
const prisma = new PrismaClient();

export let alohaWorker: Worker | null = null;

if (hasRedis) {
    const connection = new Redis(process.env.REDIS_URL as string);
    alohaWorker = new Worker('aloha-ingestion', async job => {
        const { rawPayloadId, payload, receivedAt } = job.data;
        
        console.log(`[ALOHA WORKER] Processing Raw DB Payload ID: ${rawPayloadId} received at ${receivedAt}`);
        
        if (!payload.store_id) {
            await prisma.rawIntegrationPayload.update({
                where: { id: rawPayloadId },
                data: { status: 'FAILED' }
            });
            throw new Error('Payload missing store_id routing key');
        }

        const { store_id, business_date, items } = payload;
        console.log(`[ALOHA WORKER] Mapping ALOHA payload to CanonicalEvent for Store: ${store_id}`);

        let totalProcessed = 0;
        let normalizedItems: any[] = [];
        
        if (Array.isArray(items)) {
            for (const item of items) {
                normalizedItems.push({
                    sku: item.name,
                    qty: item.qty,
                    price: item.price || 0,
                    voided: item.voided || false
                });
                totalProcessed++;
            }
        }

        // Create the CanonicalEvent
        const canonical = await prisma.canonicalEvent.create({
            data: {
                payload_id: rawPayloadId,
                store_id: String(store_id),
                event_type: 'SalesSummaryReceived',
                normalized_data: { business_date, items: normalizedItems }
            }
        });

        // Mark the RawPayload as completed
        await prisma.rawIntegrationPayload.update({
            where: { id: rawPayloadId },
            data: { status: 'COMPLETED' }
        });

        console.log(`[ALOHA WORKER] Canonical Event ${canonical.id} generated (${totalProcessed} line items).`);
        
        return {
            status: 'completed',
            canonicalId: canonical.id,
            transactionsProcessed: totalProcessed
        };

    }, { connection });

    alohaWorker.on('completed', job => {
        console.log(`[ALOHA QUEUE] Job ${job.id} officially finalized and retired.`);
    });

    alohaWorker.on('failed', (job, err) => {
        console.error(`[ALOHA QUEUE CRITICAL] Job ${job?.id} FAILED: ${err.message}`);
        // Here we would trigger an alert to Datadog / Slack for SRE team
    });
} else {
    console.log('[ALOHA WORKER] Skipping Worker initialization because REDIS_URL is not provided (Mock Mode).');
}
