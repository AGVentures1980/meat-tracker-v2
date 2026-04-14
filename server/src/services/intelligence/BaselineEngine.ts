interface BaselineStats {
    mean: number;
    std_dev: number;
    trend: number; 
}

export interface BaselineContext {
    lbs_guest_delta: BaselineStats;
    invoice_variance: BaselineStats;
    shrink_probability: BaselineStats;
    valid_data_points: number;
    baseline_contaminated: boolean; // Flagged when std_dev scales catastrophically
}

export class BaselineEngine {
    
    // Core Mathematical Primitives (No External AI dependencies)
    private static calculateMean(arr: number[]): number {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    private static calculateStdDev(arr: number[], mean: number): number {
        if (!arr || arr.length <= 1) return 0;
        const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1); // Sample Variance
        return Math.sqrt(variance);
    }

    private static calculateSlope(arr: number[]): number {
        if (!arr || arr.length <= 1) return 0;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = arr.length;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += arr[i];
            sumXY += (i * arr[i]);
            sumX2 += (i * i);
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    private static generateStats(arr: number[]): BaselineStats {
        const mean = this.calculateMean(arr);
        return {
            mean,
            std_dev: this.calculateStdDev(arr, mean),
            trend: this.calculateSlope(arr)
        };
    }

    // Accepts historical payloads and mathematically parses them
    public static computeHistoricalBaseline(snapshots: any[]): BaselineContext | null {
        // Enforce Fallback Rules (Requires minimum 14 valid days within the 30-day window per TEST 1)
        if (!snapshots || snapshots.length < 14) {
            return null; // Signals Fallback to Global Static Rules
        }

        const lbsGstDelta = snapshots.map(s => s.lbs_guest_delta_pct).filter(val => typeof val === 'number');
        const invoiceVar = snapshots.map(s => s.invoice_variance_score || 0); 
        const shrinkProb = snapshots.map(s => s.shrink_probability_score || 0);
        
        const lbsStats = this.generateStats(lbsGstDelta);

        // TEST 2: Contaminated Baseline 
        // A standard deviation over 15.0% proves continuous logistical meltdown, nullifying Adaptive Logic.
        if (lbsStats.std_dev > 15.0 || lbsStats.trend < -2.0) {
            return {
                lbs_guest_delta: { mean: 0, std_dev: 0, trend: 0 },
                invoice_variance: { mean: 0, std_dev: 0, trend: 0 },
                shrink_probability: { mean: 0, std_dev: 0, trend: 0 },
                valid_data_points: snapshots.length,
                baseline_contaminated: true // Overrides adaptive logic completely
            };
        }

        return {
            lbs_guest_delta: lbsStats,
            invoice_variance: this.generateStats(invoiceVar),
            shrink_probability: this.generateStats(shrinkProb),
            valid_data_points: snapshots.length,
            baseline_contaminated: false
        };
    }
}
