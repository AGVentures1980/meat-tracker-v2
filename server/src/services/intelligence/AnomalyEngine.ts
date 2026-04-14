import { ScoreCalculator } from "./ScoreCalculator";
import { BaselineContext } from "./BaselineEngine";

export type AnomalyInput = {
    lbs_guest_delta_pct: number;
    invoice_variance: number;
    shrink_probability: number;
    ingestion_confidence: number;
    missing_days: number;
    store_trust_score: number;
    baselineContext: BaselineContext | null; // Adaptive Baseline Hook
};

export type AnomalyResult = {
    type: string;
    severity: string;  
    trigger_value: number; 
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
                trigger_value: input.store_trust_score, 
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
        
        // Single Feature Outlier: Evaluate if Adaptive Context exists for LBS Yield
        let isLbsOutlier = false;
        let anomalyReasonString = "Mathematical Yield bounds broken with Piecewise escalation.";
        
        const absLbsDelta = Math.abs(input.lbs_guest_delta_pct);
        const dynamicYieldSeverityScore = ScoreCalculator.normalizeLbsVariance(input.lbs_guest_delta_pct);
        
        // ADAPTIVE CALIBRATION OVERRIDE: Z-Score
        if (input.baselineContext && input.baselineContext.lbs_guest_delta.std_dev > 0) {
            const zScore = Math.abs(input.lbs_guest_delta_pct - input.baselineContext.lbs_guest_delta.mean) / input.baselineContext.lbs_guest_delta.std_dev;
            // A Z-Score > 2 means 95% certainty this is an organic outlier for THIS specific store
            if (zScore > 2.0 && dynamicYieldSeverityScore > 40) { 
                 isLbsOutlier = true;
                 anomalyReasonString = `Store Z-Score hit ${zScore.toFixed(2)}, violating typical Standard Deviation of ${input.baselineContext.lbs_guest_delta.std_dev.toFixed(2)}.`;
            }
        } else {
            // FALLBACK TO GLOBAL STATIC THRESHOLDS IF LESS THAN 10 DAYS DATA
            if (absLbsDelta > 8.5 || dynamicYieldSeverityScore > 60) {
                 isLbsOutlier = true;
            }
        }

        if (isLbsOutlier) {
            anomalies.push({
                type: input.lbs_guest_delta_pct > 0 ? 'CRITICAL_LBS_OVERYIELD' : 'CRITICAL_LBS_UNDERYIELD',
                severity: this.evaluateSeverity(dynamicYieldSeverityScore),
                trigger_value: input.lbs_guest_delta_pct,
                message: `Meat Consumption delta decoupled from Target Yield by a RAW amount of ${input.lbs_guest_delta_pct.toFixed(2)}%`,
                actions: [
                    {
                         action_code: input.lbs_guest_delta_pct > 0 ? 'CALIBRATE_MEAT_SERVERS' : 'REVIEW_YIELD_WASTE',
                         title: input.lbs_guest_delta_pct > 0 ? 'Recalibrate Portions' : 'Audit Prep Waste',
                         description: 'Store is drifting out of Theoretical expectation bounds based on deterministic logic.',
                         rationale: anomalyReasonString,
                         owner_role: 'KITCHEN_MANAGER',
                         priority: 'URGENT'
                    }
                ]
            });
        }

        return anomalies;
    }
}
