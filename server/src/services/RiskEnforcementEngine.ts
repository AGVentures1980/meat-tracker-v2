import { FraudEvaluationProfile, RiskLevel } from './FraudIntelligenceEngine';

export interface EnforcementResult {
    originalStatus: string;
    finalStatus: string;
    enforcementAction: 'NONE' | 'DEMOTED_TO_REVIEW_REQUIRED' | 'FORCED_REJECTED';
    enforcementReason: string | null;
}

export class RiskEnforcementEngine {
    
    public static enforce(
        role: string, 
        profile: FraudEvaluationProfile, 
        complianceStatus: string
    ): EnforcementResult {
        
        let finalStatus = complianceStatus;
        let action: "NONE" | "DEMOTED_TO_REVIEW_REQUIRED" | "FORCED_REJECTED" = 'NONE';
        let reason = null;

        // If compliance already rejected it organically, the system is safe.
        if (complianceStatus === 'REJECTED') {
            return { originalStatus: complianceStatus, finalStatus, enforcementAction: 'NONE', enforcementReason: 'Already Rejected Organically' };
        }

        // 1. CRITICAL RISK ENFORCEMENT
        if (profile.riskLevel === 'CRITICAL') {
            finalStatus = 'REJECTED';
            action = 'FORCED_REJECTED';
            reason = 'Risk Level is CRITICAL. Absolute blockade invoked. Override is universally disabled for this payload.';
            return { originalStatus: complianceStatus, finalStatus, enforcementAction: action, enforcementReason: reason };
        }

        // 2. HIGH RISK ENFORCEMENT
        if (profile.riskLevel === 'HIGH') {
            // Is it a standard operator?
            if (!['admin', 'director', 'owner', 'partner'].includes(role)) {
                if (complianceStatus === 'ACCEPTED' || complianceStatus === 'ACCEPTED_WITH_WARNING') {
                    finalStatus = 'REVIEW_REQUIRED';
                    action = 'DEMOTED_TO_REVIEW_REQUIRED';
                    reason = `Risk Level is HIGH. Role '${role}' lacks clearance to accept anomalous structural payloads. Demoted to REVIEW_REQUIRED.`;
                }
            } else {
                // Exec allowed to bypass explicitly, but warning is enforced.
                if (complianceStatus === 'ACCEPTED') {
                     finalStatus = 'ACCEPTED_WITH_WARNING';
                }
            }
        }

        return {
            originalStatus: complianceStatus,
            finalStatus,
            enforcementAction: action,
            enforcementReason: reason
        };
    }
}
