import { PrismaClient } from '@prisma/client';
import { VarianceSeverity } from '../contracts/IntegrationContracts';

const prisma = new PrismaClient();

export class ConsumptionAllocationEngine {

    /**
     * Allocates units consumed against actual raw inventory for A La Carte items (Ribs, Lamb, Filet)
     */
    public static async allocateSale(
        storeId: number, 
        posSalesLineId: string, 
        productCode: string, 
        qtySold: number, 
        sourceSystem: 'POS' | 'OLO', 
        destination: 'SALAO' | 'BAR' | 'DELIVERY'
    ) {
        
        // 1. Find Allocation Rule for the product
        const rule = await prisma.consumptionAllocationRule.findFirst({
            where: { storeId, productCode }
        });

        if (!rule) {
            throw new Error(`CRITICAL: No consumption allocation rule configured for Product ${productCode}`);
        }

        let lbsToAllocate = 0;
        const unitsConsumed = qtySold * rule.unitsPerSale;

        // 2. Physics check: Compute theoretical lb consumption
        if (rule.allocationMethod === 'FIXED_WEIGHT') {
            if (!rule.fixedPortionWeightLbs) {
                throw new Error('Rule is FIXED_WEIGHT but missing fixedPortionWeightLbs');
            }
            lbsToAllocate = unitsConsumed * rule.fixedPortionWeightLbs;
        } else if (rule.allocationMethod === 'UNIT_BASED') {
            // Placeholder computation: 1 case ~ 70 lbs, / 10 units = 7 lbs per unit
            // A more complex iteration maps through actual oldest box for real allocation
            // Here we assume standard ratio for pre-allocation.
            const historicBoxAvgWeight = 70.0;
            const lbsPerUnit = historicBoxAvgWeight / rule.unitsPerCase;
            lbsToAllocate = unitsConsumed * lbsPerUnit;
        }

        // 3. Draft Allocation (We link to the null box for unallocated pool, or oldest box in advanced flows)
        // In this execution we just reserve the general ledger for the engine to reconcile.
        await prisma.proteinConsumptionAllocation.create({
            data: {
                productCode,
                unitsConsumed,
                lbsAllocated: lbsToAllocate,
                sourceSystem,
                destinationType: destination as any,
                posSalesLineId,
                // Box will ideally be found by oldest-first FIFO matching
                // sourceProteinBoxId: findOldestBoxId(storeId, productCode)
            }
        });

        return {
            success: true,
            unitsConsumed,
            lbsAllocated,
            methodUsed: rule.allocationMethod
        };
    }

    /**
     * The Master Tribunal that executes every Monday morning 
     * cross matching OLO, POS, Transformation Batches and Receiving.
     */
    public static async runWeeklyReconciliation(storeId: number, startPeriod: Date, endPeriod: Date) {
        // Here we trigger the reconciliation framework
        // comparing (Received + StartInventory) vs (Allocations + Batches + Sales Lbs)
        
        const event = await prisma.reconciliationEvent.create({
            data: {
                storeId,
                businessDate: endPeriod,
                status: 'OPEN'
            }
        });

        // Scaffold Variance Cases (Channel Imbalance, Sales Exceed Capacity etc)
        // ...
        
        return event;
    }
}
