import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InventoryEngineService {
    static async submitWeeklyInventory(params: {
        storeId: number;
        cycleId: string;
        proteinId: string;
        countedLbs: number;
        forceWarningOverride?: boolean;
    }) {
        const { storeId, cycleId, proteinId, countedLbs, forceWarningOverride } = params;

        // Calculate True Baseline Dynamically
        const rawBoxes = await prisma.proteinBox.findMany({
            where: {
                store_id: storeId,
                status: 'RECEIVED' // Maps to IN_COOLER equivalent
            }
        });

        // "EXCESS_RECEIPT exclusion from inventory baseline must be rule-based, not status-fragile.
        // Any box/item with financialStatus != 'APPROVED' must be excluded from usable systemWeightLb"
        let coolerBoxesWeight = 0;
        for (const box of rawBoxes) {
            if (box.source_receiving_event) {
                const receivingEvent = await prisma.receivingEvent.findUnique({
                    where: { id: box.source_receiving_event }
                });
                
                // Rule-based: Any box linked to a financialStatus != APPROVED is structurally invisible to inventory.
                if (receivingEvent && receivingEvent.financialStatus !== 'APPROVED') {
                    continue; // Skip this box from system baseline, regardless of matchStatus string value
                }
            }
            coolerBoxesWeight += (box.available_weight_lb || 0);
        }

        const producedItems = await prisma.transformationOutput.aggregate({
            _sum: {
                weightProduced: true
            },
            where: {
                batch: { storeId: storeId, status: 'OPEN' }
            }
        });

        const systemWeightLb = coolerBoxesWeight + (producedItems._sum.weightProduced || 0);

        const delta = countedLbs - systemWeightLb;
        const deltaPct = systemWeightLb > 0 ? (Math.abs(delta) / systemWeightLb) * 100 : 0;

        // Enforcement Rules
        if (deltaPct > 15.0) {
            await prisma.auditEvent.create({
                data: { action: 'INVENTORY_SUBMITTED_CRITICAL_BLOCK', actor: 'OPERATOR', store_id: storeId, payload: { expected: systemWeightLb, actual: countedLbs, deltaPct: deltaPct } }
            });
            throw new Error(`CRITICAL INVENTORY BLOCK: Variance of ${deltaPct.toFixed(2)}% exceeds absolute limit of 15%. Inventory counting rejected.`);
        }

        if (deltaPct >= 5.0 && deltaPct <= 15.0 && !forceWarningOverride) {
            await prisma.auditEvent.create({
                data: { action: 'INVENTORY_SUBMITTED_WARNING_HOLD', actor: 'OPERATOR', store_id: storeId, payload: { expected: systemWeightLb, actual: countedLbs, deltaPct: deltaPct } }
            });
            return { 
                success: false, 
                status: 'WARNING_REQUIRE_CONFIRMATION',
                message: `WARNING: Variance of ${deltaPct.toFixed(2)}% requires manager explicit justification override to submit.` 
            };
        }

        return await prisma.$transaction(async (tx) => {
            // SUCCESS - Update Inventory Item
            const upsertItem = await tx.inventoryItem.upsert({
                where: {
                    cycle_id_protein_id: { cycle_id: cycleId, protein_id: proteinId }
                },
                create: {
                    cycle_id: cycleId,
                    protein_id: proteinId,
                    expected_lbs: systemWeightLb,
                    systemWeightLb: systemWeightLb,
                    actual_lbs: countedLbs,
                    variance_lbs: delta,
                    delta: delta,
                    deltaPct: deltaPct
                },
                update: {
                    expected_lbs: systemWeightLb,
                    systemWeightLb: systemWeightLb,
                    actual_lbs: countedLbs,
                    variance_lbs: delta,
                    delta: delta,
                    deltaPct: deltaPct
                }
            });

            await tx.auditEvent.create({
                data: { action: 'INVENTORY_SUBMITTED_SUCCESS', actor: 'OPERATOR', store_id: storeId, target_id: upsertItem.id, payload: { expected: systemWeightLb, actual: countedLbs, deltaPct: deltaPct } }
            });

            return { 
                success: true, 
                item: upsertItem, 
                metrics: { systemWeightLb, countedLbs, delta, deltaPct } 
            };
        });
    }
}
