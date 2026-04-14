import { PrismaClient, OutboxEvent } from '@prisma/client';
import { intakeQueue } from './intakeQueue';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const POLLER_ID = `POLLER_${uuidv4()}`;

// Circuit Breaker State
let consecutiveFailures = 0;
let circuitBreakerUntil = 0;

export async function processOutbox() {
    if (process.env.ENABLE_OUTBOX_POLLER !== 'true') {
        console.log(`[FEATURE FLAG] Outbox Poller [${POLLER_ID}] is DISABLED.`);
        return;
    }

    const nowMs = Date.now();
    if (nowMs < circuitBreakerUntil) {
        return; // Circuit is Open, pausing silently backoff
    }

    try {
        // Block 2: Backpressure mechanism ensuring Redis does not get overwhelmed
        const currentQueueDepth = await intakeQueue.getWaitingCount();
        if (currentQueueDepth > 250) {
            console.warn(`[BACKPRESSURE ALERT] BullMQ waiting count (${currentQueueDepth}) exceeds threshold (250). Pausing poller.`);
            return;
        }

        // Block 3: Atomic Resilient Claim avoiding Dual-Queue via SKIP LOCKED
        const lockedEvents = await prisma.$queryRaw<OutboxEvent[]>`
            UPDATE "OutboxEvent"
            SET status = 'PUBLISHING', locked_at = NOW(), locked_by = ${POLLER_ID}
            WHERE id IN (
                SELECT id FROM "OutboxEvent"
                WHERE status = 'PENDING'
                AND created_at < NOW() - INTERVAL '5 seconds'
                ORDER BY created_at ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *;
        `;

        if (lockedEvents.length === 0) {
            consecutiveFailures = 0; // Heal if connected normally and returning 0 events
            return; 
        }

        for (const event of lockedEvents) {
            try {
                // native BullMQ guarantee: uniqueness by jobId = event.id
                await intakeQueue.add(event.topic, { itemId: (event.payload as any).itemId, outboxId: event.id, tenant_id: event.tenant_id }, {
                    jobId: event.id, 
                    attempts: 3, 
                    backoff: { type: 'exponential', delay: 2000 }
                });

                await prisma.$transaction([
                    prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PUBLISHED', published_at: new Date(), locked_by: null, locked_at: null } }),
                    prisma.goldenDatasetItem.update({ where: { id: (event.payload as any).itemId }, data: { status: 'QUEUED', job_id: event.id } })
                ]);

                consecutiveFailures = 0; // Successfully talked to DB + Redis. Heal circuit.
            } catch (e: any) {
                console.error(`[OutboxPoller ${POLLER_ID}] FAILED Push Evt ${event.id}:`, e.message);
                await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PENDING', error: e.message, locked_by: null, locked_at: null } }).catch(console.error);
                
                // Track failure for circuit
                consecutiveFailures++;
                if (consecutiveFailures >= 5) {
                    console.error(`🚨 [CIRCUIT BREAKER OPEN] Subsystem failing consistently. Redis down? Backoff for 60s.`);
                    circuitBreakerUntil = Date.now() + 60000;
                    break; // stop processing batch
                }
            }
        }
    } catch(e: any) {
        console.error(`[OutboxPoller ${POLLER_ID}] Critical Runtime Collapse: `, e.message);
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
             console.error(`🚨 [CIRCUIT BREAKER OPEN] Postgres / DB failure. Backoff for 60s.`);
             circuitBreakerUntil = Date.now() + 60000;
        }
    }
}

const POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL_MS || '5000');
setInterval(processOutbox, POLLING_INTERVAL);
