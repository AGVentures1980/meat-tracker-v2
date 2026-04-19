import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductionEngineService {
    static async recordProduction(params: {
        batchId: string;
        boxId: string;
        weightToProduceLbs: number;
        unitsProduced?: number;
    }) {
        const { batchId, boxId, weightToProduceLbs, unitsProduced } = params;

        return await prisma.$transaction(async (tx) => {
            const box = await tx.proteinBox.findUnique({
                where: { id: boxId },
                include: {
                    transformationInputs: true
                }
            });

            if (!box) {
                throw new Error("Source Protein box not found");
            }

            // 2. CROSS-MODULE EXCESS_RECEIPT BLOCK
            if (box.source_receiving_event) {
                const receivingEvent = await tx.receivingEvent.findUnique({
                    where: { id: box.source_receiving_event }
                });
                if (receivingEvent && receivingEvent.matchStatus === 'EXCESS_RECEIPT') {
                    if (receivingEvent.financialStatus !== 'APPROVED') {
                        throw new Error("CROSS MODULE BLOCK: Box was flagged as an EXCESS_RECEIPT and its financialStatus is not APPROVED. It is currently locked from production.");
                    }
                }
            }

            // 2. HARD BLOCK CHECK: Cannot produce what doesn't exist.
            const alreadyProducedWeight = box.transformationInputs.reduce((acc, input) => acc + input.weightUsed, 0);
            const actualAvailableLbs = box.received_weight_lb - alreadyProducedWeight;

            if (weightToProduceLbs > actualAvailableLbs) {
                await tx.auditEvent.create({
                    data: { action: 'PRODUCTION_HARD_BLOCK_TRIGGERED', actor: 'OPERATOR', target_id: box.id, payload: { actualAvailableLbs, attemptedWeight: weightToProduceLbs } }
                });
                // We return failure instead of throwing so the AuditEvent correctly persists 
                // while the box mutation is bypassed. The controller handles this explicitly.
                return { success: false, status: 'OVERFLOW', error: `HARD BLOCK: Overflow detected. Box only has ${actualAvailableLbs} lbs available. Attempted to produce ${weightToProduceLbs} lbs.` };
            }

            // Warn if capacity exceeds 95% threshold of remainder
            const capacityHitRatio = weightToProduceLbs / actualAvailableLbs;
            let warningMessage = null;
            if (capacityHitRatio > 0.95 && capacityHitRatio < 1.0) {
                warningMessage = "WARNING: Box is within 95% of maximum physical yield capacity.";
            }

            const transformationInput = await tx.transformationInput.create({
                data: {
                    batchId: batchId,
                    sourceProteinBoxId: box.id,
                    sourceType: 'PRIME_CUT',
                    weightUsed: weightToProduceLbs
                }
            });

            // If actualAvailableLbs > weightToProduceLbs, we have a leftover!
            const leftoverWeight = actualAvailableLbs - weightToProduceLbs;
            
            await tx.proteinBox.update({
                where: { id: box.id },
                data: {
                    available_weight_lb: leftoverWeight,
                    status: leftoverWeight <= 0 ? 'CONSUMED' : 'PULLED_TO_PREP'
                }
            });

            if (leftoverWeight > 0) {
                await tx.producedInventoryItem.create({
                    data: {
                        store_id: box.store_id,
                        source_batch_id: batchId,
                        source_box_id: box.id,
                        product_name: `Leftover from ${box.product_name}`,
                        weight_lb: leftoverWeight,
                        status: 'AVAILABLE'
                    }
                });
            }

            await tx.transformationOutput.create({
                data: {
                    batchId: batchId,
                    productCode: 'RECORDED_PRODUCTION',
                    unitsProduced: unitsProduced || 1,
                    weightProduced: weightToProduceLbs
                }
            });

            await tx.auditEvent.create({
                data: { action: 'PRODUCTION_YIELD_RECORDED', actor: 'OPERATOR', target_id: batchId, payload: { sourceBoxId: box.id, weightProduced: weightToProduceLbs, leftoverWeight, isWarning: !!warningMessage } }
            });

            return { success: true, input: transformationInput, warning: warningMessage, leftoverWeight };
        });
    }
}
