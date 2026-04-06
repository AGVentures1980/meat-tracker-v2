import { PrismaClient } from '@prisma/client';
import { BaselineResult, TripleBaselineService } from './TripleBaselineService';

const prisma = new PrismaClient();

export interface TrendDetectionResult {
    trend_detected: boolean;
    pattern: 'consistent_underperformance' | 'abnormal_spike' | 'gradual_degradation' | 'none';
    supplier: string;
    cut: string;
    variance_range: string;
    occurrences: number;
    time_window: string;
}

export class TrendEngine {
    public static async analyze(storeId: number, cutName: string, supplier: string, baselines: BaselineResult): Promise<TrendDetectionResult> {
        
        // Fetch recent trimming evaluation operations
        const recentEvents = await prisma.trimRecordEvent.findMany({
            where: { store_id: storeId, protein_name: cutName },
            orderBy: { created_at: 'desc' },
            take: 10
        });

        if (recentEvents.length < 3) {
            return {
                trend_detected: false,
                pattern: 'none',
                supplier, cut: cutName, variance_range: 'N/A', occurrences: recentEvents.length, time_window: 'N/A'
            };
        }

        let underperformanceCount = 0;
        let avgVariance = 0;

        // Establish the comparative anchor (Baseline C -> B -> A)
        const comparativeYield = baselines.internalBaseline.avg_yield || baselines.industryBenchmark.expected_yield || baselines.supplierSpec.expected_yield;

        if (!comparativeYield) {
            return {
                trend_detected: false,
                pattern: 'none',
                supplier, cut: cutName, variance_range: 'N/A', occurrences: 0, time_window: 'N/A'
            };
        }

        // Evaluate historical variance
        for (const event of recentEvents) {
            if (event.yield_pct < comparativeYield - 2) { 
                underperformanceCount++;
                avgVariance += (comparativeYield - event.yield_pct);
            }
        }

        if (underperformanceCount >= 3) { // Trend established if 3 out of last 10 are significantly degraded
            avgVariance = avgVariance / underperformanceCount;
            return {
                trend_detected: true,
                pattern: 'consistent_underperformance',
                supplier,
                cut: cutName,
                variance_range: `-${avgVariance.toFixed(2)}%`,
                occurrences: underperformanceCount,
                time_window: 'Last 10 Logs'
            };
        }

        return {
            trend_detected: false,
            pattern: 'none',
            supplier, cut: cutName, variance_range: '+0%', occurrences: 0, time_window: 'N/A'
        };
    }
}
