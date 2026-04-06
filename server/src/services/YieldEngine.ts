import { PrismaClient } from '@prisma/client';
import { TripleBaselineService } from './TripleBaselineService';
import { TrendEngine } from './TrendEngine';

const prisma = new PrismaClient();

export class YieldEngine {
    public static async processTrimRecord(storeId: number, proteinName: string, inputWeight: number, trimWeight: number): Promise<void> {
        if (inputWeight <= 0) return;
        const yieldPct = ((inputWeight - trimWeight) / inputWeight) * 100;

        await prisma.trimRecordEvent.create({
            data: { store_id: storeId, protein_name: proteinName, input_weight: inputWeight, trim_weight: trimWeight, yield_pct: yieldPct }
        });

        const store = await prisma.store.findUnique({ where: { id: storeId }, include: { company: true }});
        if (!store) return;

        const baselines = await TripleBaselineService.getBaselines(storeId, store.company_id, proteinName);
        
        // Trigger Trend Engine check (Could be routed to AlertEngine locally if true)
        const trend = await TrendEngine.analyze(storeId, proteinName, "VARIOUS", baselines);

        const expectedYield = baselines.internalBaseline.avg_yield || baselines.industryBenchmark.expected_yield || baselines.supplierSpec.expected_yield;
        
        if (expectedYield && yieldPct < expectedYield) {
            const expectedUsable = inputWeight * (expectedYield / 100);
            const actualUsable = inputWeight - trimWeight;
            const lostLbs = expectedUsable - actualUsable;

            let classification = 'UNKNOWN';
            
            if (baselines.supplierSpec.expected_yield && yieldPct < baselines.supplierSpec.expected_yield) {
                if (baselines.internalBaseline.avg_yield && Math.abs(yieldPct - baselines.internalBaseline.avg_yield) < 2) {
                     classification = 'SUPPLIER_ISSUE'; 
                } else if (baselines.internalBaseline.avg_yield && yieldPct < baselines.internalBaseline.avg_yield - 5) {
                     classification = 'OPERATIONAL_ISSUE'; 
                } else {
                     classification = 'SUPPLIER_ISSUE';
                }
            } else {
                 classification = 'OPERATIONAL_ISSUE'; 
            }

            if (lostLbs > 0) {
                const spec = await prisma.corporateProteinSpec.findFirst({ where: { company_id: store.company_id, protein_name: proteinName }});
                const cost = spec?.cost_per_lb || 0;
                
                await prisma.financialLeakageEvent.create({
                    data: {
                        store_id: storeId,
                        cut_name: proteinName,
                        supplier: spec?.supplier || "UNKNOWN",
                        lost_lbs: lostLbs,
                        cost_per_lb: cost,
                        estimated_loss_usd: lostLbs * cost,
                        source_of_loss: 'YIELD_VARIANCE',
                        baseline_reference: 'TRIPLE_MATRIX_AVERAGE',
                        classification: classification,
                        confidence_score: 0.85
                    }
                });
            }
        }
    }
}
