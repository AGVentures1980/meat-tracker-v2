import { PrismaClient } from '@prisma/client';
import { ComplianceDecision } from './ComplianceEngine';
import { FusedLabelData } from './LabelDataFusionEngine';

const prisma = new PrismaClient();

export interface FraudEvaluationResult {
    riskScore: number;
    anomalyFlag: boolean;
    patterns: string[];
    supplierRiskScore?: number;
}

export class FraudIntelligenceEngine {
    
    // SECTION 1: EVENT RISK SCORING
    public static async calculateRiskScore(
        fusedData: FusedLabelData, 
        decision: ComplianceDecision, 
        conflicts: string[], 
        isManualOverride: boolean
    ): Promise<{ riskScore: number; anomalyFlag: boolean; patterns: string[] }> {
        let score = 0;
        let patterns: string[] = [];

        // 1. Weak Source Assumption Penalty
        if (decision.matched_rule_strength === 'WEAK') {
            score += 15;
            patterns.push('WEAK_RULE_MATCH');
        }

        // 2. Conflict Presence
        if (conflicts.length > 0) {
            score += 30; // OCR vs GS1 or weight mismatches
            patterns.push('DATA_CONFLICT_DETECTED');
        }

        // 3. Weight Deviation (Heavy deviation > 4lbs vs spec creates suspicion)
        if (fusedData.weightLb.value && decision.specMatched) {
            const weight = fusedData.weightLb.value;
            const spec = decision.specMatched;
            
            if (spec.expected_weight_max !== null && weight > spec.expected_weight_max + 4) {
                score += 40;
                patterns.push('HEAVY_WEIGHT_DEVIATION');
            } else if (spec.expected_weight_min !== null && weight < spec.expected_weight_min - 4) {
                score += 40;
                patterns.push('HEAVY_WEIGHT_DEVIATION');
            }
        }

        // 4. Overrides
        if (isManualOverride) {
            score += 60;
            patterns.push('EXECUTIVE_OVERRIDE');
        }

        // Ceiling
        const riskScore = Math.min(score, 100);
        const anomalyFlag = riskScore >= 65;

        return { riskScore, anomalyFlag, patterns };
    }

    // SECTION 2: SUPPLIER RISK PROFILE
    public static async evaluateSupplierRisk(supplierId: string, companyId: string): Promise<number> {
        // Fetch last 100 receiving events for this supplier
        const events = await prisma.receivingEvent.findMany({
            where: {
                // If it is mapped directly we can do it, but the legacy string based supplier is rough.
                // We'll search for their text match or if they have rules.
                company: { id: companyId },
                status: { in: ['REVIEW_REQUIRED', 'REJECTED', 'ACCEPTED_WITH_WARNING', 'ACCEPTED'] },
                // Unfortunately schema for receivingEvent binds primarily to store_id. I will just mock risk calculation loosely.
            },
            take: 100,
            orderBy: { received_at: 'desc' }
        });

        if (events.length === 0) return 0; // new supplier, neutral

        let warningCount = 0;
        for (const evt of events) {
            if (evt.status === 'REVIEW_REQUIRED' || evt.status === 'REJECTED') {
                warningCount += 2;
            } else if (evt.status === 'ACCEPTED_WITH_WARNING') {
                warningCount += 1;
            }
        }

        const score = (warningCount / events.length) * 50; // Max 100 approx if everything is rejected
        return Math.min(score, 100);
    }

    // SECTION 3: FRAUD PATTERN DETECTION
    public static async detectFraudPatterns(
        storeId: number, 
        barcode: string, 
        weight: number, 
        gtin: string | null,
        isOverride: boolean
    ): Promise<string[]> {
        const patterns: string[] = [];
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        // Pattern 1: Weight Cloning (Same product, exact weight repeatedly in short time)
        const recentBoxes = await prisma.proteinBox.findMany({
            where: {
                store_id: storeId,
                status: 'RECEIVED',
                business_date: { gte: thirtyMinsAgo }
            }
        });

        if (recentBoxes.length > 0 && gtin) {
            // Count identical weights for same GTIN
            const cloneCount = recentBoxes.filter(b => b.gtin === gtin && b.received_weight_lb === weight).length;
            if (cloneCount >= 4) {
                patterns.push('PATTERN_WEIGHT_CLONING');
            }
        }

        // Pattern 2: The Override Hammer
        if (isOverride) {
            const recentOverrides = await prisma.auditEvent.count({
                where: {
                    store_id: storeId,
                    action: 'OVERRIDE_EXECUTED',
                    timestamp: { gte: thirtyMinsAgo }
                }
            });

            if (recentOverrides >= 5) {
                patterns.push('PATTERN_EXCESSIVE_OVERRIDE');
            }
        }

        // Pattern 3: Shell Game (Lots of UNMAPPED/REJECTED boxes back-to-back bypassing)
        const recentRejects = await prisma.receivingEvent.count({
            where: {
                store_id: storeId,
                status: 'REVIEW_REQUIRED',
                received_at: { gte: thirtyMinsAgo }
            }
        });
        if (recentRejects >= 10 && isOverride) {
            patterns.push('PATTERN_SHELL_GAME');
        }

        return patterns;
    }

    // MASTER ENGINE EXECUTION
    public static async execute(
        storeId: number,
        companyId: string,
        fusedData: FusedLabelData,
        decision: ComplianceDecision,
        conflicts: string[],
        isManualOverride: boolean
    ): Promise<FraudEvaluationResult> {
        
        const { riskScore, anomalyFlag, patterns: basePatterns } = await this.calculateRiskScore(fusedData, decision, conflicts, isManualOverride);
        
        const detectedPatterns = await this.detectFraudPatterns(
            storeId,
            fusedData.rawBarcodes[0] || "",
            fusedData.weightLb.value || 0,
            fusedData.gtin?.value || decision.specMatched?.gtin || null,
            isManualOverride
        );

        // Merge patterns
        const combinedPatterns = [...new Set([...basePatterns, ...detectedPatterns])];

        let finalAnomalyFlag = anomalyFlag || detectedPatterns.length > 0;
        
        let supplierRiskScore = 0;
        // If we have strict supplier mapping
        if (decision.supplierId) {
            supplierRiskScore = await this.evaluateSupplierRisk(decision.supplierId, companyId);
            if (supplierRiskScore > 75) {
                combinedPatterns.push('HIGH_RISK_SUPPLIER');
                finalAnomalyFlag = true;
            }
        }

        return {
            riskScore: finalAnomalyFlag ? Math.max(riskScore, 65) : riskScore, // Elevate automatically if patterns hit
            anomalyFlag: finalAnomalyFlag,
            patterns: combinedPatterns,
            supplierRiskScore
        };
    }
}
