import { PrismaClient, CorporateProteinSpec } from '@prisma/client';
import { FusedLabelData } from './BarcodeDecisionEngine';

const prisma = new PrismaClient();

export interface ComplianceDecision {
  status: 'ACCEPTED' | 'ACCEPTED_WITH_WARNING' | 'REJECTED' | 'REVIEW_REQUIRED';
  reason_code: 'WEIGHT_BELOW_SPEC' | 'WEIGHT_ABOVE_SPEC' | 'YIELD_CRITICAL' | 'UNMAPPED_GTIN' | 'WEAK_RULE_MATCH' | 'DATA_CONFLICT' | 'NONE';
  reference: 'supplier_spec' | 'benchmark' | 'baseline';
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  specMatched: CorporateProteinSpec | null;
  matched_rule_id?: string | null;
  matched_rule_strength?: 'STRONG' | 'MEDIUM' | 'WEAK' | null;
  match_type?: 'GTIN' | 'PRODUCT_CODE' | 'PREFIX' | 'REGEX' | null;
  supplierId?: string | null;
}

export class ComplianceEngine {
    public static async evaluate(fusedData: FusedLabelData, companyId: string, supplierId?: string | null, conflicts?: string[]): Promise<ComplianceDecision> {
        let matchedSpec = null;
        let activeRule = null;
        let activeRuleType: 'SupplierRule' | 'LegacyRule' | null = null;

        const priorityMap: Record<string, number> = {
            'STRONG': 3,
            'MEDIUM': 2,
            'WEAK': 1
        };

        // 0. Pre-Flight Conflict Shield
        if (conflicts && conflicts.length > 0) {
            console.warn(`[SECURITY] DATA_CONFLICT detected: ${conflicts.join(' | ')}`);
            return {
                 status: 'REVIEW_REQUIRED',
                 reason_code: 'DATA_CONFLICT',
                 reference: 'supplier_spec',
                 severity: 'WARNING',
                 details: `Conflito de Extração Múltipla. Intervenção Operacional Necessária. (Conflicts: ${conflicts.join(', ')})`,
                 specMatched: null
            };
        }

        const fallbackRawBarcode = fusedData.rawBarcodes.length > 0 ? fusedData.rawBarcodes[0] : null;

        // 1. Supplier-Aware Rules (V3 Extension)
        let supplierRules = await prisma.supplierBarcodeRule.findMany({
            where: { 
                companyId: companyId, 
                isActive: true,
                ...(supplierId ? { supplierId } : {})
            },
            include: { supplier: true }
        });

        if (supplierRules.length > 0) {
            supplierRules.sort((a, b) => priorityMap[b.matchStrength || 'WEAK'] - priorityMap[a.matchStrength || 'WEAK']);

            const foundSupplierRule = supplierRules.find(r => 
                (r.matchType === 'GTIN' && r.gtin === fusedData.gtin.value) ||
                (r.matchType === 'PRODUCT_CODE' && r.normalizedProductCode === fusedData.productCodeBase.value) ||
                (r.matchType === 'PREFIX' && r.rawBarcodePattern && fallbackRawBarcode?.startsWith(r.rawBarcodePattern) && fallbackRawBarcode.length >= (r.minPrefixLength || 6))
            );

            if (foundSupplierRule) {
                activeRule = foundSupplierRule;
                activeRuleType = 'SupplierRule';
            }
        }

        // 2. Legacy Strict Rules (Fallback)
        if (!activeRule) {
            const rules = await prisma.receivingRecognitionRule.findMany({
                where: { company_id: companyId, is_active: true },
                include: { spec: true }
            });

            if (rules.length > 0) {
                rules.sort((a, b) => priorityMap[b.match_strength || 'WEAK'] - priorityMap[a.match_strength || 'WEAK']);
                activeRule = rules.find(r => 
                    (r.gtin && r.gtin === fusedData.gtin.value) || 
                    (r.normalized_product_code && r.normalized_product_code === fusedData.productCodeBase.value) ||
                    (r.raw_barcode_pattern && r.raw_barcode_pattern.length > 0 && fallbackRawBarcode?.startsWith(r.raw_barcode_pattern))
                );
                if (activeRule) activeRuleType = 'LegacyRule';
            }
        }

        if (activeRule) {
            let activeRuleStrength = activeRuleType === 'SupplierRule' ? (activeRule as any).matchStrength : (activeRule as any).match_strength;
            
            if (activeRuleStrength === 'WEAK') {
                 console.warn(`[SECURITY] WEAK_RULE_TRIGGERED applied for rule ${activeRule.id}`);
                 return {
                     status: 'REVIEW_REQUIRED',
                     reason_code: 'WEAK_RULE_MATCH',
                     reference: 'supplier_spec',
                     severity: 'WARNING',
                     details: 'Match baseado em padrão fraco. Requer validação manual.',
                     specMatched: null,
                     matched_rule_id: activeRule.id,
                     matched_rule_strength: 'WEAK',
                     match_type: activeRuleType === 'SupplierRule' ? (activeRule as any).matchType : 'PREFIX', // Simplified for legacy
                     supplierId: activeRuleType === 'SupplierRule' ? (activeRule as any).supplierId : null
                 };
            }

            // At this point, the rule is STRONG or MEDIUM
            if (activeRuleType === 'LegacyRule') {
                matchedSpec = (activeRule as any).spec;
            } else {
                // Fetch the spec for the SupplierRule
                matchedSpec = await prisma.corporateProteinSpec.findUnique({
                    where: { id: (activeRule as any).proteinSpecId }
                });
            }
        } else {
            // Fallback Legacy Flow: Hard match direto no master data
            const specs = await prisma.corporateProteinSpec.findMany({
                where: { company_id: companyId }
            });

            matchedSpec = specs.find(s => s.approved_item_code === fusedData.productCodeBase.value);
            if (!matchedSpec && fallbackRawBarcode) {
                matchedSpec = specs.find(s => s.approved_item_code === fallbackRawBarcode);
            }
        }

        if (!matchedSpec) {
            return {
                status: 'REJECTED',
                reason_code: 'UNMAPPED_GTIN',
                reference: 'supplier_spec',
                severity: 'CRITICAL',
                details: 'No matching CorporateProteinSpec found.',
                specMatched: null
            };
        }

        const activeRuleId = activeRule?.id || null;
        const activeRuleMatchStrength = activeRule ? (activeRuleType === 'SupplierRule' ? (activeRule as any).matchStrength : (activeRule as any).match_strength) : null;
        const activeRuleMatchType = activeRule ? (activeRuleType === 'SupplierRule' ? (activeRule as any).matchType : 'PREFIX') : null;
        const resolvedSupplierId = activeRuleType === 'SupplierRule' ? (activeRule as any).supplierId : null;

        if (matchedSpec.expected_weight_min !== null && fusedData.weightLb.value !== null) {
            if (fusedData.weightLb.value < matchedSpec.expected_weight_min) {
                 return {
                    status: 'ACCEPTED_WITH_WARNING',
                    reason_code: 'WEIGHT_BELOW_SPEC',
                    reference: 'supplier_spec',
                    severity: 'WARNING',
                    details: `Weight (${fusedData.weightLb.value} lb) < MIN (${matchedSpec.expected_weight_min} lb)`,
                    specMatched: matchedSpec,
                    matched_rule_id: activeRuleId,
                    matched_rule_strength: activeRuleMatchStrength as any,
                    match_type: activeRuleMatchType as any,
                    supplierId: resolvedSupplierId
                 };
            }
        }
        
        if (matchedSpec.expected_weight_max !== null && fusedData.weightLb.value !== null) {
            if (fusedData.weightLb.value > matchedSpec.expected_weight_max) {
                 return {
                    status: matchedSpec.allow_exception_receiving ? 'ACCEPTED_WITH_WARNING' : 'REJECTED',
                    reason_code: 'WEIGHT_ABOVE_SPEC',
                    reference: 'supplier_spec',
                    severity: matchedSpec.allow_exception_receiving ? 'WARNING' : 'CRITICAL',
                    details: `Weight (${fusedData.weightLb.value} lb) > MAX (${matchedSpec.expected_weight_max} lb)`,
                    specMatched: matchedSpec,
                    matched_rule_id: activeRuleId,
                    matched_rule_strength: activeRuleMatchStrength as any,
                    match_type: activeRuleMatchType as any,
                    supplierId: resolvedSupplierId
                 };
            }
        }

        // New condition: Weight is valid but comes from a WEAK source (e.g. OCR only)
        if (fusedData.weightLb.value !== null && fusedData.weightLb.confidence < 0.8) {
            return {
                status: 'ACCEPTED_WITH_WARNING',
                reason_code: 'NONE', // Or could be LOW_CONFIDENCE_WEIGHT
                reference: 'supplier_spec',
                severity: 'WARNING',
                details: `Weight is within bounds, but extracted with low confidence (Score: ${fusedData.weightLb.confidence}). Visual review recommended.`,
                specMatched: matchedSpec,
                matched_rule_id: activeRuleId,
                matched_rule_strength: activeRuleMatchStrength as any,
                match_type: activeRuleMatchType as any,
                supplierId: resolvedSupplierId
            };
        }

        return {
            status: 'ACCEPTED',
            reason_code: 'NONE',
            reference: 'supplier_spec',
            severity: 'INFO',
            details: 'Fully compliant to specification.',
            specMatched: matchedSpec,
            matched_rule_id: activeRuleId,
            matched_rule_strength: activeRuleMatchStrength as any,
            match_type: activeRuleMatchType as any,
            supplierId: resolvedSupplierId
        };
    }
}
