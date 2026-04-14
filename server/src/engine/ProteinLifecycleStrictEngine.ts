import { PrismaClient, BoxStatus, BoxEvent } from '@prisma/client';

const prisma = new PrismaClient();

export class HardFailError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'HardFailError';
    }
}

export class ProteinLifecycleStrictEngine {
    
    // DEFINITION OF ABSOLUTE ALLOWED TRANSITIONS
    private static VALID_TRANSITIONS: Record<BoxStatus, BoxStatus[]> = {
        RECEIVED: ['IN_COOLER', 'PULLED_TO_PREP', 'ADJUSTED', 'QUARANTINED', 'WASTE'], // In some cases, goes straight to pull if needed immediately, but preferred is IN_COOLER
        IN_COOLER: ['PULLED_TO_PREP', 'QUARANTINED', 'WASTE'],
        PULLED_TO_PREP: ['CONSUMED', 'WASTE', 'IN_COOLER'], // Can return to cooler if pulled by mistake
        CONSUMED: [], // Terminal
        WASTE: [],    // Terminal
        QUARANTINED: ['RECEIVED', 'WASTE', 'IN_COOLER'],
        ADJUSTED: ['IN_COOLER', 'PULLED_TO_PREP']
    };

    /**
     * FASE 1 - STATE MACHINE OBRIGATÓRIA
     * Validates if the box can legally transition to the next state.
     * Throws HardFailError if transition is illegal.
     */
    static validateTransition(currentStatus: BoxStatus, nextStatus: BoxStatus, boxBarcode: string) {
        if (currentStatus === nextStatus) {
            throw new HardFailError(`State Transition Error: Box ${boxBarcode} is already in state ${currentStatus}.`, 'STATE_SKIP_VIOLATION');
        }

        const allowed = this.VALID_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.includes(nextStatus)) {
            throw new HardFailError(
                `Security Lock: Invalid State Transition for Box ${boxBarcode}. Cannot go from ${currentStatus} to ${nextStatus}.`, 
                'ILLEGAL_TRANSITION_VIOLATION'
            );
        }

        return true;
    }

    /**
     * FASE 3 - DUPLICATE & REPLAY PROTECTION
     * Ensures an operation is executed exactly ONCE based on Box ID and Event Type.
     */
    static async enforceUniqueOperation(boxId: string, eventType: BoxEvent) {
        const existingEvent = await prisma.boxLifecycleEvent.findFirst({
            where: {
                box_id: boxId,
                event_type: eventType
            }
        });

        if (existingEvent) {
            throw new HardFailError(
                `Duplicate Replay Protection: BoxID ${boxId} has already executed event ${eventType}. Operation Blocked.`, 
                'DUPLICATE_OPERATION_VIOLATION'
            );
        }

        return true;
    }

    /**
     * FASE 4 - LOSS TRACKING ENGINE (CRÍTICO)
     * When moving to CONSUMED or calculating period end, ensure all weight is accounted for.
     * Allows maximum 1.5% drip/blood loss threshold.
     */
    static async trackInvisibleLoss(boxId: string, consumedWeight: number, userId: string) {
        const box = await prisma.proteinBox.findUnique({
            where: { id: boxId },
            include: { lifecycle_events: true }
        });

        if (!box) throw new HardFailError(`Box not found`, 'BOX_NOT_FOUND');

        // Sum explicit logged waste
        const wasteEvents = box.lifecycle_events.filter(e => e.event_type === 'MARK_WASTE');
        const totalExplicitWaste = wasteEvents.reduce((acc, ev) => acc + (ev.weight_variance || 0), 0);

        const initialWeight = box.received_weight_lb;
        const totalAccounted = consumedWeight + totalExplicitWaste;
        
        const missingWeight = initialWeight - totalAccounted;
        
        // 1.5% Drip / Blood Loss Tolerance
        const toleranceThreshold = initialWeight * 0.015;

        // FASE 11 - FAIL-CLOSED CONDITIONAL
        if (missingWeight > toleranceThreshold) {
            // Log Unaccounted Loss
            await prisma.boxLifecycleEvent.create({
                data: {
                    box_id: box.id,
                    store_id: box.store_id,
                    event_type: 'ADMIN_ADJUST', // We will use ADMIN_ADJUST to tag anomaly for now
                    previous_status: box.status,
                    new_status: box.status,
                    triggered_by: userId || 'SYSTEM_WATCHDOG',
                    reason: `UNACCOUNTED_LOSS: ${missingWeight.toFixed(2)} lbs vanished during prep cycle.`,
                    weight_variance: missingWeight
                }
            });

            // Trigger Alert
            const AlertEngine = require('./AlertEngine').AlertEngine;
            await AlertEngine.trigger(
                box.store_id, 
                'CRITICAL', 
                'SECURITY', 
                `UNACCOUNTED LOSS DETECTED: Box ${box.barcode} missing ${missingWeight.toFixed(2)} lbs. Tolerance exceeded.`, 
                { box_id: box.id, initial: initialWeight, consumed: consumedWeight, missing: missingWeight }
            );

            // We do NOT throw an error here because the consumption MUST happen, BUT we flag the database 
            // The DataIntegrityWatchdog will catch this and lock the Dashboard.
        }

        return {
            status: 'VALIDATED',
            unaccounted_loss: missingWeight > toleranceThreshold ? missingWeight : 0
        };
    }
}
