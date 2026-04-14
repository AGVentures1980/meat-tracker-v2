import { PrismaClient, Prisma } from '@prisma/client';
import { intakeQueue } from '../workers/intakeQueue';

export class OutboxService {
    /**
     * Creates an outbox event inside a transaction and triggers a best-effort
     * immediate push to BullMQ without breaking the transaction if BullMQ degrades.
     */
    static async enqueueItem(tx: Prisma.TransactionClient, item_id: string, tenant_id: string, idempotency_key: string) {
        const outbox = await tx.outboxEvent.create({
            data: { topic: 'process-intake', payload: { itemId: item_id }, tenant_id, idempotency_key }
        });
        
        // Best-effort push to BullMQ asynchronously AFTER the transaction commits
        // (Using setTimeout allows node to yield and the Tx to safely commit downstream)
        setTimeout(async () => {
            const prisma = new PrismaClient();
            try {
                // Ensure event exists in standard pool before publishing
                const evt = await prisma.outboxEvent.findUnique({ where: { id: outbox.id } });
                if (!evt || evt.status !== 'PENDING') return;

                await intakeQueue.add(outbox.topic, { itemId: item_id, outboxId: outbox.id }, {
                    jobId: outbox.id, 
                    attempts: 3, 
                    backoff: { type: 'exponential', delay: 2000 }
                });
                
                await prisma.$transaction([
                    prisma.outboxEvent.update({ where: { id: outbox.id }, data: { status: 'PUBLISHED' } }),
                    prisma.goldenDatasetItem.update({ where: { id: item_id }, data: { status: 'QUEUED', job_id: outbox.id } })
                ]);
            } catch (e) {
                console.error("Outbox best-effort publish failed, waiting for Poller:", e);
            } finally {
                await prisma.$disconnect();
            }
        }, 100);
        
        return outbox;
    }
}
