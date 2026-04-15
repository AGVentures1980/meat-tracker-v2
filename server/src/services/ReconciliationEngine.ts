import { PrismaClient } from '@prisma/client';
import { VarianceSeverity } from '../contracts/IntegrationContracts';

const prisma = new PrismaClient();

export interface ReconciliationResult {
    success: boolean;
    variancesDetected: Array<{
        type: string;
        severity: VarianceSeverity;
        description: string;
    }>;
}

export class ReconciliationEngine {

    /**
     * Reconciles a Specific Protein Transformation Batch by ensuring 
     * no outputs exceed inputs, and no consumption links exceed outputs.
     */
    public static async reconcileTransformationBatch(batchId: string): Promise<ReconciliationResult> {
        const batch = await prisma.proteinTransformationBatch.findUnique({
            where: { id: batchId },
            include: {
                inputs: true,
                outputs: true,
                consumptionLinks: true
            }
        });

        if (!batch) {
            throw new Error('Batch not found');
        }

        const variances: Array<{ type: string; severity: VarianceSeverity; description: string }> = [];

        // Rule 1: INPUT_WITHOUT_OUTPUT
        if (batch.inputs.length > 0 && batch.outputs.length === 0) {
            variances.push({
                type: 'INPUT_WITHOUT_OUTPUT',
                severity: 'CRITICAL',
                description: `Batch ${batchId} consumed ${batch.totalInputWeight} lbs of raw inputs but produced 0 outputs.`
            });
        }

        // Rule 2: OUTPUT_WITHOUT_INPUT (Ghost Production)
        if (batch.outputs.length > 0 && batch.inputs.length === 0) {
            variances.push({
                type: 'OUTPUT_WITHOUT_INPUT',
                severity: 'CRITICAL',
                description: `Batch ${batchId} produced ${batch.totalOutputUnits} units out of thin air, with no input boxes linked.`
            });
        }

        // Rule 3: SALES_EXCEED_PRODUCTION
        const totalSalesLinked = batch.consumptionLinks.reduce((acc, link) => acc + link.unitsConsumed, 0);
        if (totalSalesLinked > batch.totalOutputUnits) {
            variances.push({
                type: 'SALES_EXCEED_PRODUCTION',
                severity: 'CRITICAL',
                description: `POS/OLO attempted to consume ${totalSalesLinked} units, but batch only produced ${batch.totalOutputUnits}.`
            });
        }

        // Rule 4: PRODUCTION_OVER_CONSUMPTION (Stranded Inventory / Potential Theft)
        if (totalSalesLinked < batch.totalOutputUnits && batch.status === 'CLOSED') {
            variances.push({
                type: 'PRODUCTION_OVER_CONSUMPTION',
                severity: 'HIGH',
                description: `Batch ${batchId} produced ${batch.totalOutputUnits} but POS only consumed ${totalSalesLinked}. Potential unaccounted loss of ${batch.totalOutputUnits - totalSalesLinked} units.`
            });
        }

        // Rule 5: ABNORMAL_YIELD (Custom logic per product, placeholder check)
        if (batch.yieldPercentage < 45.0 && batch.inputs.length > 0) {
            variances.push({
                type: 'ABNORMAL_YIELD',
                severity: 'HIGH',
                description: `Batch ${batchId} reported a dangerously low yield of ${batch.yieldPercentage}%. Standard threshold is >45%.`
            });
        }

        return {
            success: variances.length === 0,
            variancesDetected: variances
        };
    }
}
