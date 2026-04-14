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
    is_capped?: boolean;
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

        // ENTERPRISE HARDENING: Immediate Strict Trust Checking (TEST 4)
        if (input.store_trust_score < 65) {
            anomalies.push({
                type: 'SYSTEM_SUPPRESSION_LOW_TRUST',
                severity: 'LOW', // Degraded from CRITICAL to prevent False positive C-Level Alerts 
                trigger_value: input.store_trust_score, 
                message: 'All Operational Anomaly Engines SUPPRESSED. Math dictates Data Trust Score is annihilated.',
                actions: [
                    {
                        action_code: 'FIX_INTEGRITY_GAPS',
                        title: 'Require Immediate Missing Documents Upload',
                        description: 'System detects dropped invoices or failed OLO dumps blocking Operational Intelligence.',
                        rationale: 'Scoring an operation without Full Data is statistically reckless.',
                        owner_role: 'STORE_MANAGER', // Store manager's fault, not an executive risk
                        priority: 'MEDIUM' 
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

        // TEST 10: Cross-Vector Signal Conflict Detection
        // If the store is wasting lots of meat (>8% yield failure) but somehow the invoice costs dropped significantly (< -5% cost), there is a logical disconnect indicating fraud, ghost shipments, or blind spots.
        if (input.lbs_guest_delta_pct > 8.0 && input.invoice_variance < -5.0) {
              anomalies.push({
                  type: 'SIGNAL_CONFLICT_DETECTED',
                  severity: 'CRITICAL',
                  trigger_value: input.invoice_variance,
                  message: `Inventory Paradox: High Protein Dissipation (${input.lbs_guest_delta_pct}%) paired with Undersized Invoice Cost (${input.invoice_variance}%). Possible Ghost Invoice or Theft.`,
                  actions: [
                      {
                          action_code: 'FINANCIAL_FRAUD_AUDIT',
                          title: 'Audit Receiving and Waste Logs',
                          description: 'There is a mathematical impossibility occurring between cost reduction and protein loss.',
                          rationale: 'Divergent Signal Constraint Triggered.',
                          owner_role: 'FINANCE',
                          priority: 'URGENT'
                      }
                  ]
              });
        }
        
        // Single Feature Outlier check preserving pure un-normalized payload
        let isLbsOutlier = false;
        let anomalyReasonString = "Mathematical Yield bounds broken with Piecewise escalation.";
        
        const absLbsDelta = Math.abs(input.lbs_guest_delta_pct);
        const dynamicYieldSeverityScore = ScoreCalculator.normalizeLbsVariance(input.lbs_guest_delta_pct);
        
        // ADAPTIVE CALIBRATION OVERRIDE & GLOBAL CAP GOVERNANCE
        const GLOBAL_MAX_LBS_VARIANCE_TOLERANCE = 10.0; // Phase 6.2.2.2 Mandatory Max Cap

        // Test 2: Ensure Baseline is actually valid, not contaminated
        if (input.baselineContext && !input.baselineContext.baseline_contaminated && input.baselineContext.lbs_guest_delta.std_dev > 0) {
            
            // Allow expansion up to 2 Standard Deviations dynamically based on Local Variance
            const localAdaptiveTolerance = input.baselineContext.lbs_guest_delta.std_dev * 2.0;

            // SRE GOVERNANCE: Effective Threshold cannot breach Global Dictation
            const effectiveTolerance = Math.min(localAdaptiveTolerance, GLOBAL_MAX_LBS_VARIANCE_TOLERANCE);

            // Audit the absolute drift from store's typical baseline
            const drift = Math.abs(input.lbs_guest_delta_pct - input.baselineContext.lbs_guest_delta.mean);
            
            // Trigger if the store breached their Adaptive max OR the Global Cap (whichever is lower/stricter)
            if (drift > effectiveTolerance && dynamicYieldSeverityScore > 40) {
                 isLbsOutlier = true;
                 anomalyReasonString = `Store Drift (${drift.toFixed(2)}%) breached SRE Effective Tolerance (${effectiveTolerance.toFixed(2)}%). StdDev was ${input.baselineContext.lbs_guest_delta.std_dev.toFixed(2)}.`;
            }
        } else {
            // FALLBACK TO GLOBAL STATIC THRESHOLDS IF LESS THAN 14 DAYS DATA OR BASELINE CONTAMINATED
            if (absLbsDelta > 8.5 || dynamicYieldSeverityScore > 60) {
                 isLbsOutlier = true;
            }
        }

        if (isLbsOutlier) {
            // TEST 3: Outlier Extremo Explicit Tagging
            const isCapped = dynamicYieldSeverityScore === 100;
            const cappedMsg = isCapped ? " [CAPPED: 100%]" : "";

            anomalies.push({
                type: input.lbs_guest_delta_pct > 0 ? 'CRITICAL_LBS_OVERYIELD' : 'CRITICAL_LBS_UNDERYIELD',
                severity: this.evaluateSeverity(dynamicYieldSeverityScore),
                trigger_value: input.lbs_guest_delta_pct, // Raw preserved
                is_capped: isCapped,
                message: `Meat Consumption delta decoupled from Target Yield by a RAW amount of ${input.lbs_guest_delta_pct.toFixed(2)}%${cappedMsg}`,
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
