import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { alohaQueue } from '../queues/processingQueue';

const prisma = new PrismaClient();

export class AlohaWebhookController {
    /**
     * POST /api/v1/integrations/aloha/closeout
     * Core Ingestor for all ALOHA End-of-Day pushes.
     * Expects a JSON payload and an Authorization Bearer token (API Key).
     */
    static async ingestPayload(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
            }

            const payloadSize = JSON.stringify(req.body).length;
            const { store_id, business_date } = req.body;

            if (!store_id || !business_date) {
                return res.status(400).json({ error: 'Payload must include store_id and business_date for integrity mapping.' });
            }
            
            // Generate a strict idempotency key: hash(source + store_id + business_date)
            // Or better yet, just a deterministic string.
            const idempotencyKey = `ALOHA_CLOSEOUT_${store_id}_${business_date}`;

            // Check for existing payload to enforce idempotency inline if desired,
            // or let the DB unique constraint handle it. We'll do an upsert or check to prevent crashing.
            
            let rawPayload;
            try {
                rawPayload = await prisma.rawIntegrationPayload.create({
                    data: {
                        idempotency_key: idempotencyKey,
                        source_id: 'ALOHA_WEBHOOK',
                        store_id: String(store_id),
                        raw_json: req.body,
                        status: 'PENDING'
                    }
                });
            } catch (err: any) {
                // Prisma Unique Constraint violation (P2002) means we already intercepted this transaction
                if (err.code === 'P2002') {
                    console.log(`[ALOHA WEBHOOK] Idempotency trip: Payload ${idempotencyKey} already exists. Dropping duplicate.`);
                    return res.status(202).json({
                        message: 'Payload received and dropped (duplicate idempotency key).',
                        idempotencyKey
                    });
                }
                throw err;
            }

            // Push payload to BullMQ for asynchronous processing
            const job = await alohaQueue.add('process-eod-aloha', {
                rawPayloadId: rawPayload.id,
                payload: req.body,
                receivedAt: new Date().toISOString()
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 }
            });

            console.log(`[ALOHA WEBHOOK] Received payload (${payloadSize} bytes). DB Stored. Queued as Job #${job.id}`);

            // Return 202 Accepted IMMEDIATELY to free the ALOHA terminal string
            return res.status(202).json({
                message: 'Payload received and queued for processing.',
                jobId: job.id,
                idempotencyKey: idempotencyKey
            });

        } catch (error: any) {
            console.error('[ALOHA WEBHOOK] Fatal error ingesting payload:', error);
            // 503 instead of 500 to tell ALOHA to retry later if the queue or DB is completely broken
            return res.status(503).json({ error: 'Service Unavailable. Please retry.' });
        }
    }
}
