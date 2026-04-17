import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReceivingEngineService {
    static async scanWithConcurrencyLock(params: {
        storeId: number;
        shipmentId: string;
        scannedBarcode: string;
        extractedWeightLb: number;
        confidenceScore?: number;
        canonicalFamilyId?: string;
    }) {
        const { storeId, shipmentId, scannedBarcode, extractedWeightLb, confidenceScore, canonicalFamilyId } = params;

        // 1. HARD LIMIT OVERRIDE GUARDS
        if (confidenceScore && confidenceScore < 0.90) {
            return { status: 'REVIEW_REQUIRED', message: 'Confidence < 90%. Manual validation needed.' };
        }

        // Execute Prisma Transaction with raw locking logic
        return await prisma.$transaction(async (tx) => {
            const lockedUnits = await tx.$queryRaw<any[]>`
                SELECT id, "expectedWeightLb" 
                FROM "InboundLineUnit"
                WHERE shipment_id = ${shipmentId}
                  AND status = 'AVAILABLE'
                ORDER BY ABS("expectedWeightLb" - ${extractedWeightLb}) ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            `;

            const matchedUnit = lockedUnits?.[0];

            if (!matchedUnit) {
                // ZERO CANDIDATES:
                const excessEvent = await tx.receivingEvent.create({
                    data: {
                        store_id: storeId,
                        scanned_barcode: scannedBarcode,
                        weight: extractedWeightLb,
                        status: 'COMPLETED',
                        matchStatus: 'EXCESS_RECEIPT',
                        financialStatus: 'PENDING_RECONCILIATION',
                        weightType: 'VARIABLE'
                    }
                });

                await tx.auditEvent.create({
                    data: { action: 'RECEIVING_EXCESS_RECEIPT_CREATED', actor: 'OPERATOR', store_id: storeId, target_id: excessEvent.id, payload: { scannedBarcode, extractedWeightLb } }
                });

                return { event: excessEvent, status: 'EXCESS_RECEIPT' };
            }

            // HARD LIMIT EVALUATION (HYBRID WEIGHT TOLERANCE):
            const expectedWt = Number(matchedUnit.expectedWeightLb);
            const actualWt = Number(extractedWeightLb);
            const diff = Math.abs(expectedWt - actualWt);
            const allowedTolerance = Math.max(5.0, expectedWt * 0.02);

            if (diff > allowedTolerance) {
                await tx.auditEvent.create({
                    data: { action: 'RECEIVING_HARD_LIMIT_REJECTION', actor: 'OPERATOR', store_id: storeId, target_id: matchedUnit.id, payload: { diff, allowedTolerance, expectedWt, actualWt } }
                });
                throw new Error(`Match rejected. Absolute variance (${diff.toFixed(2)} lbs) exceeds allowed tolerance of ${allowedTolerance.toFixed(2)} lbs.`);
            }

            // SUCCESSFUL MATCH
            const validEvent = await tx.receivingEvent.create({
                data: {
                    store_id: storeId,
                    scanned_barcode: scannedBarcode,
                    weight: extractedWeightLb,
                    status: 'COMPLETED',
                    matchStatus: 'MATCHED',
                    weightType: 'VARIABLE', 
                    financialStatus: 'APPROVED'
                }
            });

            await tx.inboundLineUnit.update({
                where: { id: matchedUnit.id },
                data: {
                    status: 'MATCHED',
                    matched_event_id: validEvent.id
                }
            });

            await tx.auditEvent.create({
                data: { action: 'RECEIVING_UNIT_MATCHED', actor: 'OPERATOR', store_id: storeId, target_id: validEvent.id, payload: { unitId: matchedUnit.id, variance: diff } }
            });

            return { event: validEvent, status: 'MATCHED', unit: matchedUnit };
        });
    }
}
