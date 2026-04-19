import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReceivingEngineService {
    static async scanWithConcurrencyLock(params: {
        storeId: number;
        shipmentId: string;
        operatorId: string;
        scannedBarcode: string;
        extractedWeightLb: number;
        confidenceScore?: number;
        recognizedFamily?: string;
        // Supervisor override fields
        supervisorId?: string;
        overrideEvidenceType?: string; // 'different_serial', 'verified_manual_weight', etc.
        overrideJustification?: string;
    }) {
        const { storeId, shipmentId, operatorId, scannedBarcode, extractedWeightLb, confidenceScore, recognizedFamily, supervisorId, overrideEvidenceType, overrideJustification } = params;

        return await prisma.$transaction(async (tx) => {
            // 1. DUPLICATE BARCODE CHECK
            const existingDuplicate = await tx.receivingEvent.findFirst({
                where: { scanned_barcode: scannedBarcode, shipment_id: shipmentId }
            });

            let finalBarcodeToSave = scannedBarcode;
            let alternativeIdentifier = null;
            let isOverride = false;
            let barcodeSourceType = 'REAL';
            let originalBarcode = null;

            if (existingDuplicate) {
                // Duplicate detected.
                if (!supervisorId) {
                    await tx.auditEvent.create({
                        data: { action: 'DUPLICATE_BARCODE_ATTEMPT', actor: operatorId, store_id: storeId, target_id: existingDuplicate.id, payload: { scannedBarcode, shipmentId } }
                    });
                    return { success: false, status: 'DUPLICATE_BARCODE_DETECTED', error: `HARD BLOCK: Duplicate barcode detected in shipment ${shipmentId}.` };
                }

                // If supervisor provided, validate evidence
                const validEvidenceTypes = ['different_serial', 'verified_manual_weight', 'lot_distinct'];
                if (!overrideEvidenceType || !validEvidenceTypes.includes(overrideEvidenceType)) {
                    await tx.auditEvent.create({
                        data: { action: 'DUPLICATE_BARCODE_JUSTIFICATION_REJECTED', actor: operatorId, store_id: storeId, payload: { scannedBarcode, justification: overrideJustification } }
                    });
                    return { success: false, status: 'SUPERVISOR_OVERRIDE_REJECTED', error: `HARD BLOCK: Supervisor override rejected. Valid physical evidence type required, text justification alone is prohibited.` };
                }

                // Approve supervisor override, but alter the barcode to satisfy DB unique index
                finalBarcodeToSave = `${scannedBarcode}_OVERRIDE_${Date.now()}`;
                alternativeIdentifier = scannedBarcode;
                isOverride = true;
                barcodeSourceType = 'OVERRIDE';
                originalBarcode = scannedBarcode;

                await tx.auditEvent.create({
                    data: { action: 'SUPERVISOR_DUPLICATE_BARCODE_OVERRIDE', actor: supervisorId, store_id: storeId, payload: { originalBarcode: scannedBarcode, newBarcode: finalBarcodeToSave, evidence: overrideEvidenceType } }
                });
            }

            // 2. HARD LIMIT OVERRIDE GUARDS
            if (confidenceScore && confidenceScore < 0.90) {
                return { status: 'REVIEW_REQUIRED', message: 'Confidence < 90%. Manual validation needed.' };
            }

            // Execute raw locking fetch
            const lockedUnits = await tx.$queryRaw<any[]>`
                SELECT id, "expectedWeightLb", item_name 
                FROM "InboundLineUnit"
                WHERE shipment_id = ${shipmentId}
                  AND status = 'AVAILABLE'
                  AND (canonical_family_id = ${recognizedFamily} OR supply_chain_approved_id = ${recognizedFamily})
                ORDER BY ABS("expectedWeightLb" - ${extractedWeightLb}) ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            `;

            const matchedUnit = lockedUnits?.[0];

            if (!matchedUnit) {
                // Determine Excess Reason
                const excessReason = 'NO_UNITS_REMAINING_FOR_FAMILY';
                
                const excessEvent = await tx.receivingEvent.create({
                    data: {
                        store_id: storeId,
                        shipment_id: shipmentId,
                        scanned_barcode: finalBarcodeToSave,
                        barcode_source_type: barcodeSourceType,
                        original_barcode: originalBarcode,
                        excess_receipt_reason: excessReason,
                        weight: extractedWeightLb,
                        status: 'COMPLETED',
                        matchStatus: 'EXCESS_RECEIPT',
                        financialStatus: 'PENDING_RECONCILIATION',
                        weightType: 'VARIABLE',
                        requires_supply_chain_review: true,
                        override_flag: isOverride,
                        supervisor_id: supervisorId,
                        alternative_box_identifier: alternativeIdentifier
                    }
                });

                await tx.auditEvent.create({
                    data: { action: 'RECEIVING_EXCESS_RECEIPT_CREATED', actor: operatorId, store_id: storeId, target_id: excessEvent.id, payload: { scannedBarcode: finalBarcodeToSave, extractedWeightLb, excessReason } }
                });

                return { event: excessEvent, status: 'EXCESS_RECEIPT' };
            }

            // HARD LIMIT EVALUATION (HYBRID WEIGHT TOLERANCE):
            const expectedWt = Number(matchedUnit.expectedWeightLb);
            const actualWt = Number(extractedWeightLb);
            const diff = Math.abs(expectedWt - actualWt);
            const allowedTolerance = Math.max(5.0, expectedWt * 0.02);

            if (diff > allowedTolerance) {
                // Check past failures for consecutive tracking
                const pastFailures = await tx.auditEvent.findMany({
                    where: { action: 'RECEIVING_HARD_LIMIT_REJECTION', actor: operatorId, store_id: storeId },
                    orderBy: { timestamp: 'desc' },
                    take: 5
                });
                
                // Rough tracking for test purposes
                const failureCount = pastFailures.filter(f => f.timestamp > new Date(Date.now() - 5 * 60000)).length;

                await tx.auditEvent.create({
                    data: { action: 'RECEIVING_HARD_LIMIT_REJECTION', actor: operatorId, store_id: storeId, target_id: matchedUnit.id, payload: { scannedBarcode, diff, allowedTolerance, expectedWt, actualWt } }
                });

                if (failureCount >= 2) { // 3rd attempt
                    await tx.auditEvent.create({
                        data: { action: 'CONSECUTIVE_WEIGHT_FAILURES', actor: operatorId, store_id: storeId, payload: { scannedBarcode } }
                    });
                    return { success: false, status: 'CONSECUTIVE_WEIGHT_FAILURES', error: `Match rejected. Absolute variance (${diff.toFixed(2)} lbs). CONSECUTIVE_WEIGHT_FAILURES triggered. Supervisor review required.` };
                }

                return { success: false, status: 'HARD_LIMIT_REJECTION', error: `Match rejected. Absolute variance (${diff.toFixed(2)} lbs) exceeds allowed tolerance of ${allowedTolerance.toFixed(2)} lbs.` };
            }

            // SUCCESSFUL MATCH
            const validEvent = await tx.receivingEvent.create({
                data: {
                    store_id: storeId,
                    shipment_id: shipmentId,
                    scanned_barcode: finalBarcodeToSave,
                    barcode_source_type: barcodeSourceType,
                    original_barcode: originalBarcode,
                    weight: extractedWeightLb,
                    status: 'COMPLETED',
                    matchStatus: 'MATCHED',
                    weightType: 'VARIABLE', 
                    financialStatus: 'APPROVED',
                    override_flag: isOverride,
                    supervisor_id: supervisorId,
                    alternative_box_identifier: alternativeIdentifier
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
                data: { action: 'RECEIVING_UNIT_MATCHED', actor: operatorId, store_id: storeId, target_id: validEvent.id, payload: { unitId: matchedUnit.id, variance: diff } }
            });

            return { event: validEvent, status: 'MATCHED', unit: matchedUnit };
        });
    }
}
