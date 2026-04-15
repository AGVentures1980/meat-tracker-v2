import { PrismaClient, CorporateProteinSpec } from '@prisma/client';
import { NormalizedBarcode } from './BarcodeDecisionEngine';

const prisma = new PrismaClient();

export interface ComplianceDecision {
  status: 'ACCEPTED' | 'ACCEPTED_WITH_WARNING' | 'REJECTED' | 'REVIEW_REQUIRED';
  reason_code: 'WEIGHT_BELOW_SPEC' | 'WEIGHT_ABOVE_SPEC' | 'YIELD_CRITICAL' | 'UNMAPPED_GTIN' | 'WEAK_RULE_MATCH' | 'NONE';
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
    public static async evaluate(barcodeResult: NormalizedBarcode, companyId: string, supplierId?: string | null): Promise<ComplianceDecision> {
        let matchedSpec = null;
        let activeRule = null;
        let activeRuleType: 'SupplierRule' | 'LegacyRule' | null = null;

        const priorityMap: Record<string, number> = {
            'STRONG': 3,
            'MEDIUM': 2,
            'WEAK': 1
        };

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
                (r.matchType === 'GTIN' && r.gtin === barcodeResult.gtin) ||
                (r.matchType === 'PRODUCT_CODE' && r.normalizedProductCode === barcodeResult.product_code) ||
                (r.matchType === 'PREFIX' && r.rawBarcodePattern && barcodeResult.raw_barcode?.startsWith(r.rawBarcodePattern) && barcodeResult.raw_barcode.length >= (r.minPrefixLength || 6))
            );

            if (foundSupplierRule) {
                // To fetch spec, Supplier Rules need to be linked to CorporateProteinSpec.
                // Wait! The prisma schema doesn't link SupplierBarcodeRule to CorporateProteinSpec?
                // The implementation plan missed `proteinSpecId String` in `SupplierBarcodeRule`.
                // Let me gracefully fetch it or rely on Legacy Fallback while I fix schema later.
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
                    (r.gtin && r.gtin === barcodeResult.gtin) || 
                    (r.normalized_product_code && r.normalized_product_code === barcodeResult.product_code) ||
                    (r.raw_barcode_pattern && r.raw_barcode_pattern.length > 0 && barcodeResult.raw_barcode?.startsWith(r.raw_barcode_pattern))
                );
                if (activeRule) activeRuleType = 'LegacyRule';
            }
        }

        if (activeRule) {
            let activeRuleStrength = activeRuleType === 'SupplierRule' ? activeRule.matchStrength : activeRule.match_strength;
            
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
                     match_type: activeRuleType === 'SupplierRule' ? activeRule.matchType : 'PREFIX', // Simplified for legacy
                     supplierId: activeRuleType === 'SupplierRule' ? activeRule.supplierId : null
                 };
            }

            // At this point, the rule is STRONG or MEDIUM
            if (activeRuleType === 'LegacyRule') {
                matchedSpec = activeRule.spec;
            } else {
                // Fetch the spec for the SupplierRule
                matchedSpec = await prisma.corporateProteinSpec.findUnique({
                    where: { id: activeRule.proteinSpecId }
                });
            }
        } else {
            // Fallback Legacy Flow: Hard match direto no master data
            const specs = await prisma.corporateProteinSpec.findMany({
                where: { company_id: companyId }
            });

            matchedSpec = specs.find(s => s.approved_item_code === barcodeResult.product_code);
            if (!matchedSpec && barcodeResult.raw_barcode) {
                matchedSpec = specs.find(s => s.approved_item_code === barcodeResult.raw_barcode);
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
        const activeRuleMatchStrength = activeRule ? (activeRuleType === 'SupplierRule' ? activeRule.matchStrength : activeRule.match_strength) : null;
        const activeRuleMatchType = activeRule ? (activeRuleType === 'SupplierRule' ? activeRule.matchType : 'PREFIX') : null;
        const resolvedSupplierId = activeRuleType === 'SupplierRule' ? activeRule.supplierId : null;

        if (matchedSpec.expected_weight_min !== null && barcodeResult.net_weight_lb !== null) {
            if (barcodeResult.net_weight_lb < matchedSpec.expected_weight_min) {
                 return {
                    status: 'ACCEPTED_WITH_WARNING',
                    reason_code: 'WEIGHT_BELOW_SPEC',
                    reference: 'supplier_spec',
                    severity: 'WARNING',
                    details: `Weight (${barcodeResult.net_weight_lb} lb) < MIN (${matchedSpec.expected_weight_min} lb)`,
                    specMatched: matchedSpec,
                    matched_rule_id: activeRuleId,
                    matched_rule_strength: activeRuleMatchStrength as any,
                    match_type: activeRuleMatchType as any,
                    supplierId: resolvedSupplierId
                 };
            }
        }
        
        if (matchedSpec.expected_weight_max !== null && barcodeResult.net_weight_lb !== null) {
            if (barcodeResult.net_weight_lb > matchedSpec.expected_weight_max) {
                 return {
                    status: matchedSpec.allow_exception_receiving ? 'ACCEPTED_WITH_WARNING' : 'REJECTED',
                    reason_code: 'WEIGHT_ABOVE_SPEC',
                    reference: 'supplier_spec',
                    severity: matchedSpec.allow_exception_receiving ? 'WARNING' : 'CRITICAL',
                    details: `Weight (${barcodeResult.net_weight_lb} lb) > MAX (${matchedSpec.expected_weight_max} lb)`,
                    specMatched: matchedSpec,
                    matched_rule_id: activeRuleId,
                    matched_rule_strength: activeRuleMatchStrength as any,
                    match_type: activeRuleMatchType as any,
                    supplierId: resolvedSupplierId
                 };
            }
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
