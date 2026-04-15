import { PrismaClient } from '@prisma/client';
import { ComplianceDecision } from './ComplianceEngine';
import { FusedLabelData } from './BarcodeDecisionEngine';

const prisma = new PrismaClient();

// ===============================================
// FRAUD PATTERN VERSIONING & DEFINITIONS (TAREFA 2)
// ===============================================

export interface FraudPatternDefinition {
    id: string;
    patternCode: string;
    description: string;
    version: 'v1' | 'v2';
    isActive: boolean;
    threshold: number;
    windowMinutes: number;
}

export const FRAUD_PATTERNS: Record<string, FraudPatternDefinition> = {
    WEIGHT_CLONING_V1: {
        id: 'PTN-001',
        patternCode: 'PATTERN_WEIGHT_CLONING_V1',
        description: 'Detecção de múltiplas entradas seguidas com peso e GTIN exatamente iguais em curto período.',
        version: 'v1',
        isActive: true,
        threshold: 3, // 3 repeticoes
        windowMinutes: 10
    },
    EXCESSIVE_OVERRIDE_V1: {
        id: 'PTN-002',
        patternCode: 'PATTERN_EXCESSIVE_OVERRIDE_V1',
        description: 'Gestor aprovando forçadamente volumes de regras desconhecidas de forma imprudente.',
        version: 'v1',
        isActive: true,
        threshold: 5,
        windowMinutes: 60
    },
    SHELL_GAME_V1: {
        id: 'PTN-003',
        patternCode: 'PATTERN_SHELL_GAME_V1',
        description: 'Fornecedor desviando multiplos GTINs reprovados na mesma estufa de tempo.',
        version: 'v1',
        isActive: true,
        threshold: 10,
        windowMinutes: 30
    }
};

// ===============================================
// EXPLAINABLE RISK PROFILING (TAREFA 1)
// ===============================================

export interface RiskFactor {
    code: string;
    weight: number;
    description: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FraudEvaluationProfile {
    riskScore: number;
    riskLevel: RiskLevel;
    factors: RiskFactor[];
    matchedPatterns: FraudPatternDefinition[];
    supplierProfile?: SupplierBehaviorProfile;
}

export interface SupplierBehaviorProfile {
    avgRiskScore: number;
    anomalyRate: number;
    weightVariancePenalty: number;
    overrideFrequency: number;
    confidenceIndex: number; // 0 to 1
}

export class FraudIntelligenceEngine {
    
    public static async calculateRiskProfile(
        fusedData: FusedLabelData, 
        decision: ComplianceDecision, 
        conflicts: string[], 
        isManualOverride: boolean
    ): Promise<{ riskScore: number; riskLevel: RiskLevel; factors: RiskFactor[] }> {
        let score = 0;
        let factors: RiskFactor[] = [];

        // 1. Weak Source Assumption Penalty
        if (decision.matched_rule_strength === 'WEAK') {
            score += 15;
            factors.push({
                code: 'WEAK_RULE_USAGE',
                weight: 15,
                description: 'Match liberado através de fallback ou regras não homologadas rigorosamente.'
            });
        }

        // 2. Conflict Presence
        if (conflicts.length > 0) {
            score += 30; // OCR vs GS1 or weight mismatches
            factors.push({
                code: 'DETERMINISTIC_CONFLICT_OMITTED',
                weight: 30,
                description: `Sistemas independentes brigaram pelos dados de payload (${conflicts.length} alertados).`
            });
        }

        // 3. Weight Deviation (Heavy deviation > 4lbs vs spec creates suspicion)
        if (fusedData.weightLb.value && decision.specMatched) {
            const weight = fusedData.weightLb.value;
            const spec = decision.specMatched;
            
            if (spec.expected_weight_max !== null && weight > spec.expected_weight_max + 4) {
                score += 40;
                factors.push({
                    code: 'WEIGHT_DEVIATION_SURPASS',
                    weight: 40,
                    description: `O peso declarado (${weight} lb) quebra a física estipulada pelo MasterRoster max (${spec.expected_weight_max}).`
                });
            } else if (spec.expected_weight_min !== null && weight < spec.expected_weight_min - 4) {
                score += 40;
                factors.push({
                    code: 'WEIGHT_DEVIATION_LOSS',
                    weight: 40,
                    description: `O peso declarado (${weight} lb) é gravemente inferior ao limitante da embalagem min (${spec.expected_weight_min}).`
                });
            }
        }

        // 4. Overrides
        if (isManualOverride) {
            score += 60;
            factors.push({
                code: 'EXECUTIVE_FORCE_OVERRIDE',
                weight: 60,
                description: 'O Diretor ou Gerente utilizou a permissão blindada de Override sobre as validações nativas.'
            });
        }

        const riskScore = Math.min(score, 100);
        let riskLevel: RiskLevel = 'LOW';
        
        if (riskScore >= 85) riskLevel = 'CRITICAL';
        else if (riskScore >= 60) riskLevel = 'HIGH';
        else if (riskScore >= 40) riskLevel = 'MEDIUM';

        return { riskScore, riskLevel, factors };
    }

    // SECTION 4: SUPPLIER BEHAVIOR MODEL (TAREFA 4)
    public static async calculateSupplierBehaviorProfile(supplierId: string, companyId: string): Promise<SupplierBehaviorProfile> {
        const events = await prisma.receivingEvent.findMany({
            where: { company_id: companyId },
            take: 200,
            orderBy: { created_at: 'desc' }
        });

        if (events.length === 0) {
            return { avgRiskScore: 0, anomalyRate: 0, weightVariancePenalty: 0, overrideFrequency: 0, confidenceIndex: 1.0 };
        }

        let blocked = 0;
        for (const evt of events) {
            if (evt.status === 'REVIEW_REQUIRED' || evt.status === 'REJECTED') {
                blocked += 1;
            }
        }

        const anomalyRate = blocked / events.length; 
        const confidenceIndex = Math.max(0, 1.0 - (anomalyRate * 2.0)); // Plummets fast
        const avgRiskScore = Math.min(100, Math.round(anomalyRate * 100 * 1.5));

        return {
            avgRiskScore,
            anomalyRate,
            weightVariancePenalty: 0, // Placeholder
            overrideFrequency: 0, // Placeholder 
            confidenceIndex
        };
    }

    // ===============================================
    // PATTERN DETECTION MATRIX
    // ===============================================
    public static async detectFraudPatterns(
        storeId: number, 
        barcode: string, 
        weight: number, 
        gtin: string | null,
        isOverride: boolean
    ): Promise<FraudPatternDefinition[]> {
        const matched: FraudPatternDefinition[] = [];
        
        // Context 1: Pattern Peso Clonado
        const cloning = FRAUD_PATTERNS.WEIGHT_CLONING_V1;
        if (cloning.isActive && gtin) {
            const boundary = new Date(Date.now() - cloning.windowMinutes * 60 * 1000);
            const cloneCount = await prisma.proteinBox.count({
                where: {
                    store_id: storeId,
                    status: 'RECEIVED',
                    business_date: { gte: boundary },
                    gtin: gtin,
                    received_weight_lb: weight
                }
            });
            if (cloneCount >= cloning.threshold) matched.push(cloning);
        }

        // Context 2: Hammer Override
        const hammer = FRAUD_PATTERNS.EXCESSIVE_OVERRIDE_V1;
        if (hammer.isActive && isOverride) {
            const boundary = new Date(Date.now() - hammer.windowMinutes * 60 * 1000);
            const recentOverrides = await prisma.auditEvent.count({
                where: {
                    store_id: storeId,
                    action: 'OVERRIDE_EXECUTED',
                    timestamp: { gte: boundary }
                }
            });
            if (recentOverrides >= hammer.threshold) matched.push(hammer);
        }

        return matched;
    }

    // MASTER ENGINE EXECUTION
    public static async execute(
        storeId: number,
        companyId: string,
        fusedData: FusedLabelData,
        decision: ComplianceDecision,
        conflicts: string[],
        isManualOverride: boolean
    ): Promise<FraudEvaluationProfile> {
        
        let { riskScore, riskLevel, factors } = await this.calculateRiskProfile(fusedData, decision, conflicts, isManualOverride);
        
        const matchedPatterns = await this.detectFraudPatterns(
            storeId,
            fusedData.rawBarcodes[0] || "",
            fusedData.weightLb.value || 0,
            fusedData.gtin?.value || null,
            isManualOverride
        );

        if (matchedPatterns.length > 0) {
            factors.push({
                code: 'FRAUD_PATTERN_MATCHED',
                weight: 50,
                description: `Padrão Preditivo Ativo: ${matchedPatterns.map(p => p.patternCode).join(', ')}`
            });
            riskScore = Math.min(riskScore + 50, 100);
            if (riskScore >= 85) riskLevel = 'CRITICAL';
            else if (riskScore >= 60) riskLevel = 'HIGH';
        }
        
        let supplierProfile;
        if (decision.supplierId) {
            supplierProfile = await this.calculateSupplierBehaviorProfile(decision.supplierId, companyId);
            if (supplierProfile.confidenceIndex < 0.4) {
                 factors.push({
                    code: 'SUPPLIER_DEGRADING_TRUST',
                    weight: 30,
                    description: `O Supplier possuí reputação corrompida devido a ${Math.round(supplierProfile.anomalyRate * 100)}% de caixas com avisos graves.`
                });
                riskScore = Math.min(riskScore + 30, 100);
                if (riskScore >= 85) riskLevel = 'CRITICAL';
                else if (riskScore >= 60) riskLevel = 'HIGH';
            }
        }

        return {
            riskScore,
            riskLevel,
            factors,
            matchedPatterns,
            supplierProfile
        };
    }
}
