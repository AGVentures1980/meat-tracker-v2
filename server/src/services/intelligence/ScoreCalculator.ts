export class ScoreCalculator {

    // Deterministic Utility Methods
    public static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    public static normalize(value: number, min: number, max: number): number {
        if (max === min) return 0;
        return this.clamp(((value - min) / (max - min)) * 100, 0, 100);
    }

    // 1. Store Trust Score (0-100) - Missing_days Definitive Hard Rules
    static calculateStoreTrustScore(ingestionConfidence: number, missingDays: number): number {
        // ingestionConfidence expects [0.0 - 1.0] -> [0 - 100]
        let trust_score = this.normalize(ingestionConfidence, 0.0, 1.0); 
        
        // Exact Explicit Hard Rule
        if (missingDays === 0) {
            // no penalty
        } else if (missingDays === 1) {
            trust_score = Math.min(trust_score, 60);
        } else if (missingDays >= 2) {
            trust_score = 0;
        }
        
        return this.clamp(trust_score, 0, 100);
    }

    // Piecewise Non-Linear Normalizer strictly implementing User Directive Math
    static normalizeLbsVariance(val: number): number {
        const absVal = Math.abs(val);
        if (absVal <= 3) return (absVal / 3) * 20;           // 0–20
        if (absVal <= 6) return 20 + ((absVal - 3) / 3) * 30; // 20–50
        if (absVal <= 10) return 50 + ((absVal - 6) / 4) * 30; // 50–80
        return 80 + Math.min((absVal - 10) * 2, 20);         // 80–100
    }

    // 2. Operational Risk Score (0-100)
    static calculateOpRiskScore(lbsDeltaPct: number, shrinkProbability: number, invoiceVariancePct: number): number {
        // Delta Severity using Non-linear mandatory formula
        const deltaSeverity = this.normalizeLbsVariance(lbsDeltaPct); // 0-100 mapped linearly 
        
        const absInvoiceVariance = Math.abs(invoiceVariancePct);
        const invoiceSeverity = this.normalize(absInvoiceVariance, 0.0, 20.0);
        
        const shrinkSeverity = this.normalize(shrinkProbability, 0.0, 1.0); 
        
        // Composite Equation 
        const compositeRisk = (deltaSeverity * 0.5) + (invoiceSeverity * 0.3) + (shrinkSeverity * 0.2);
        
        return this.clamp(compositeRisk, 0, 100);
    }

}
