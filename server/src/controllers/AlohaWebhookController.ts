import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { alohaQueue } from '../queues/processingQueue';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class AlohaWebhookController {
    /**
     * POST /api/v1/integrations/aloha/closeout
     * Core Ingestor for all ALOHA End-of-Day pushes.
     */
    static async ingestPayload(req: Request, res: Response) {
        const traceId = uuidv4();
        console.log(`[${traceId}] [ALOHA WEBHOOK] Inbound request received.`);

        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.warn(`[${traceId}] [ALOHA WEBHOOK] Missing or invalid Authorization header.`);
                return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
            }

            const token = authHeader.split(' ')[1];
            
            // Simple Mock Validation for QA logic
            if (token !== 'ALOHA_QA_TEST_TOKEN_2026' && token !== '12345') {
                console.warn(`[${traceId}] [ALOHA WEBHOOK] Unauthorized token attempt.`);
                return res.status(401).json({ error: 'Unauthorized ALOHA Integration Token.' });
            }

            const payloadSize = JSON.stringify(req.body).length;
            const { store_id, business_date, net_sales } = req.body;

            if (!store_id || !business_date) {
                console.warn(`[${traceId}] [ALOHA WEBHOOK] Payload rejected (Missing routing keys).`);
                return res.status(400).json({ error: 'Payload must include store_id and business_date for integrity mapping.' });
            }
            
            // Generate a strict idempotency key: hash(source + store_id + business_date + net_sales)
            const idempotencyRaw = `ALOHA_CLOSEOUT_${store_id}_${business_date}_${net_sales || '0'}`;
            const idempotencyKey = crypto.createHash('sha256').update(idempotencyRaw).digest('hex');

            let rawPayload;
            try {
                rawPayload = await prisma.rawIntegrationPayload.create({
                    data: {
                        idempotency_key: idempotencyKey,
                        trace_id: traceId,
                        source_id: 'ALOHA_WEBHOOK',
                        store_id: String(store_id),
                        raw_json: req.body,
                        status: 'PENDING'
                    }
                });
            } catch (err: any) {
                if (err.code === 'P2002') {
                    console.log(`[${traceId}] [ALOHA WEBHOOK] Idempotency trip: Payload ${idempotencyKey} already exists. Dropping duplicate.`);
                    return res.status(202).json({
                        message: 'Payload received and dropped (duplicate idempotency key).',
                        traceId,
                        idempotencyKey
                    });
                }
                throw err;
            }

            const job = await alohaQueue.add('process-eod-aloha', {
                rawPayloadId: rawPayload.id,
                traceId: traceId,
                payload: req.body,
                receivedAt: new Date().toISOString()
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 }
            });

            console.log(`[${traceId}] [ALOHA WEBHOOK] Received payload (${payloadSize} bytes). DB Stored. Queued as Job #${job.id}`);

            return res.status(202).json({
                message: 'Payload received and queued for processing.',
                jobId: job.id,
                traceId: traceId,
                idempotencyKey: idempotencyKey
            });

        } catch (error: any) {
            console.error(`[${traceId}] [ALOHA WEBHOOK] Fatal error ingesting payload:`, error);
            return res.status(503).json({ error: 'Service Unavailable. Please retry.', traceId });
        }
    }

    /**
     * GET /api/v1/integrations/aloha/job/status/:payload_id
     * Returns the background processing status of a pushed payload.
     */
    static async getJobStatus(req: Request, res: Response) {
        try {
            const { payload_id } = req.params;
            
            const payload = await prisma.rawIntegrationPayload.findUnique({
                where: { id: payload_id },
                select: { status: true, trace_id: true, created_at: true }
            });

            if (!payload) {
                return res.status(404).json({ error: 'Integration payload not found.' });
            }

            return res.status(200).json(payload);
        } catch (error: any) {
            console.error('[ALOHA WEBHOOK] Error fetching job status:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
}
