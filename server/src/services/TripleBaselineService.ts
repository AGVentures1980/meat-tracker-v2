import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BaselineResult {
    supplierSpec: { expected_yield: number | null, expected_trim: number | null };
    industryBenchmark: { expected_yield: number | null, expected_trim: number | null };
    internalBaseline: { avg_yield: number | null, total_events: number };
}

export class TripleBaselineService {
    public static async getBaselines(storeId: number, companyId: string, cutName: string, supplier: string | null = null): Promise<BaselineResult> {
        
        // 1. Supplier Spec (Contract Baseline A)
        let specYield: number | null = null;
        let specTrim: number | null = null;
        const spec = await prisma.corporateProteinSpec.findFirst({
            where: { 
                company_id: companyId, 
                protein_name: cutName, 
                ...(supplier ? { supplier } : {}) 
            }
        });
        if (spec) {
            specYield = spec.expected_yield_pct;
            specTrim = spec.expected_trim_loss_pct;
        }

        // 2. Industry Benchmark (Market Baseline B)
        let bmMidYield: number | null = null;
        let bmMidTrim: number | null = null;
        const benchmark = await prisma.industryBenchmark.findFirst({
            where: { cut: cutName, active_flag: true }
        });
        if (benchmark) {
            bmMidYield = (benchmark.yield_min + benchmark.yield_max) / 2;
            bmMidTrim = (benchmark.trim_loss_min + benchmark.trim_loss_max) / 2;
        }

        // 3. Internal 30-Day Rolling Average (Historical Baseline C)
        let intYield: number | null = null;
        let eventCount = 0;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const internal = await prisma.trimRecordEvent.aggregate({
            _avg: { yield_pct: true },
            _count: { _all: true },
            where: {
                store_id: storeId,
                protein_name: cutName,
                created_at: { gte: thirtyDaysAgo }
            }
        });

        if (internal._count._all > 0 && internal._avg.yield_pct) {
            intYield = internal._avg.yield_pct;
            eventCount = internal._count._all;
        }

        return {
            supplierSpec: { expected_yield: specYield, expected_trim: specTrim },
            industryBenchmark: { expected_yield: bmMidYield, expected_trim: bmMidTrim },
            internalBaseline: { avg_yield: intYield, total_events: eventCount }
        };
    }
}
