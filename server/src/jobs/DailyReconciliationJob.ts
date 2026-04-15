import { PrismaClient } from '@prisma/client';
import { VarianceSeverity } from '../contracts/IntegrationContracts';

const prisma = new PrismaClient();

export class DailyReconciliationJob {
    
    /**
     * Executes lightweight daily end-of-day checks focusing strictly on urgent ruptures 
     * in Active multi-day boxes/lots before the heavy Weekly Audit consolidates the dollars.
     */
    public static async runDailySnapshot(storeId: number, targetDate: Date) {
        console.log(`Starting Daily Reconciliation Checks for Store ${storeId} at ${targetDate.toISOString()}`);
        
        let foundAnomalies = false;
        const variancesDetected: any[] = [];

        // 1. Check SALES_EXCEED_CAPACITY (Negative unit balances)
        const activeBoxes = await prisma.proteinBox.findMany({
            where: {
                store_id: storeId,
                status: 'RECEIVED' // Active/Opened inventory
            }
        });

        for (const box of activeBoxes) {
            // Check Multi-Day Allocation Logic for Ribs / Lamb
            // If the box hits native negative, it's a fatal breach in physics.
            if ((box.available_units !== null && box.available_units < 0) || box.available_weight_lb < 0) {
                foundAnomalies = true;
                variancesDetected.push({
                    type: 'SALES_EXCEED_CAPACITY',
                    severity: 'CRITICAL',
                    description: `Box ${box.barcode} has a ruptured balance of ${box.available_units ?? box.available_weight_lb}. Sales outpaced physical capacity.`,
                    sourceBoxId: box.id
                });
            }
        }

        // 2. Heavy Reconciliations are deferred to Monday's ConsumptionAllocationEngine.runWeeklyReconciliation()

        return {
            success: !foundAnomalies,
            variances: variancesDetected
        };
    }
}
