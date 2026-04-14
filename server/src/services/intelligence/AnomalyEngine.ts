import { ScoreCalculator } from "./ScoreCalculator";

export type AnomalyInput = {
    lbs_guest_delta_pct: number;
    invoice_variance: number;
    shrink_probability: number;
    ingestion_confidence: number;
    missing_days: number;
    store_trust_score: number;
};

export type AnomalyResult = {
    type: string;
    severity: string;  
    trigger_value: number; // Stored purely raw from the Database (no clamps hidden)
    message: string;
    actions: RecommendationTemplate[];
};

export type RecommendationTemplate = {
    action_code: string;
    title: string;
    description: string;
    rationale: string;
    owner_role: string;
    priority: string;   
};

export class AnomalyEngine {
    
    static evaluateSeverity(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
        if (score <= 35) return "LOW";
        if (score <= 60) return "MEDIUM";
        if (score <= 80) return "HIGH";
        return "CRITICAL";
    }

    static getActionPriorityForSeverity(severity: string): string {
        switch(severity) {
            case "CRITICAL": return "URGENT";
            case "HIGH": return "HIGH";
            case "MEDIUM": return "MEDIUM";
            case "LOW": default: return "LOW";
        }
    }

    static evaluate(input: AnomalyInput): AnomalyResult[] {
        const anomalies: AnomalyResult[] = [];

        // ENTERPRISE HARDENING: Immediate Strict Trust Checking
        if (input.store_trust_score < 65) {
            anomalies.push({
                type: 'SYSTEM_SUPPRESSION_LOW_TRUST',
                severity: 'CRITICAL', 
                trigger_value: input.store_trust_score, // Passing raw 
                message: 'All Operational Anomaly Engines SUPPRESSED. Math dictates Data Trust Score is annihilated.',
                actions: [
                    {
                        action_code: 'FIX_INTEGRITY_GAPS',
                        title: 'Require Immediate Missing Documents Upload',
                        description: 'System detects dropped invoices or failed OLO dumps blocking Operational Intelligence.',
                        rationale: 'Scoring an operation without Full Data is statistically reckless.',
                        owner_role: 'STORE_MANAGER',
                        priority: 'URGENT'
                    }
                ]
            });
            // HALT computation completely
            return anomalies; 
        }

        const opRisk = ScoreCalculator.calculateOpRiskScore(input.lbs_guest_delta_pct, input.shrink_probability, input.invoice_variance);
        
        if (opRisk > 35) {
             const dynamicSeverity = this.evaluateSeverity(opRisk);
             
             anomalies.push({
                 type: 'TOLERANCE_BOUNDS_CROSSED',
                 severity: dynamicSeverity,
                 trigger_value: opRisk,
                 message: `Calculated Multi-Vector Risk Score reached ${opRisk.toFixed(1)}, violating tolerance bounds.`,
                 actions: [
                     {
                         action_code: 'REVIEW_COMPOSITE_VECTOR',
                         title: 'Audit Primary Delta Drivers',
                         description: 'A Risk Score above 35 usually implies nested problems in Yield, Waste, or Billing. Review all logs.',
                         rationale: 'Action generated due to normalized threshold math over-saturation.',
                         owner_role: dynamicSeverity === 'CRITICAL' ? 'DIRECTOR' : 'STORE_MANAGER',
                         priority: this.getActionPriorityForSeverity(dynamicSeverity)
                     }
                 ]
             });
        }
        
        // Single Feature Outlier check preserving pure un-normalized payload
        const absLbsDelta = Math.abs(input.lbs_guest_delta_pct);
        const dynamicYieldSeverityScore = ScoreCalculator.normalizeLbsVariance(input.lbs_guest_delta_pct);
        
        if (absLbsDelta > 8.5 || dynamicYieldSeverityScore > 60) {
            anomalies.push({
                type: input.lbs_guest_delta_pct > 0 ? 'CRITICAL_LBS_OVERYIELD' : 'CRITICAL_LBS_UNDERYIELD',
                // Map the non-linear piecewise score to an exact English severity tag
                severity: this.evaluateSeverity(dynamicYieldSeverityScore),
                // Expose raw unmodified value to Database schema for Traceability (e.g. +950% if catastrophic limit blown)
                trigger_value: input.lbs_guest_delta_pct,
                message: `Meat Consumption delta decoupled from Standard Yield by a RAW amount of ${input.lbs_guest_delta_pct.toFixed(2)}%`,
                actions: [
                    {
                         action_code: input.lbs_guest_delta_pct > 0 ? 'CALIBRATE_MEAT_SERVERS' : 'REVIEW_YIELD_WASTE',
                         title: input.lbs_guest_delta_pct > 0 ? 'Recalibrate Portions' : 'Audit Prep Waste',
                         description: 'Store is drifting out of Theoretical expectation bounds based on deterministic non-linear piece curve.',
                         rationale: 'Mathematical Yield bounds broken with Piecewise escalation.',
                         owner_role: 'KITCHEN_MANAGER',
                         priority: 'URGENT'
                    }
                ]
            });
        }

        return anomalies;
    }
}
