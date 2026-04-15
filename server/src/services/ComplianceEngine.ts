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
}

export class ComplianceEngine {
    public static async evaluate(barcodeResult: NormalizedBarcode, companyId: string): Promise<ComplianceDecision> {
        // 1. Verificar Mapeadores Existentes (ReceivingRecognitionRule)
        const rules = await prisma.receivingRecognitionRule.findMany({
            where: { company_id: companyId, is_active: true },
            include: { spec: true }
        });

        let matchedSpec = null;
        let activeRule = null;

        if (rules.length > 0) {
            const priorityMap: Record<string, number> = {
                'STRONG': 3,
                'MEDIUM': 2,
                'WEAK': 1
            };
            
            rules.sort((a, b) => priorityMap[b.match_strength || 'WEAK'] - priorityMap[a.match_strength || 'WEAK']);

            // V2.1 Hardening - Tenta resolver por regra assistida com prioridade:
            activeRule = rules.find(r => 
                (r.gtin && r.gtin === barcodeResult.gtin) || 
                (r.normalized_product_code && r.normalized_product_code === barcodeResult.product_code) ||
                (r.raw_barcode_pattern && r.raw_barcode_pattern.length > 0 && barcodeResult.raw_barcode?.startsWith(r.raw_barcode_pattern))
            );
        }

        if (activeRule && activeRule.spec) {
            matchedSpec = activeRule.spec;

            if (activeRule.match_strength === 'WEAK') {
                 // Log Security Action
                 console.warn(`[SECURITY] WEAK_RULE_TRIGGERED applied for rule ${activeRule.id}`);
                 return {
                     status: 'REVIEW_REQUIRED',
                     reason_code: 'WEAK_RULE_MATCH',
                     reference: 'supplier_spec',
                     severity: 'WARNING',
                     details: 'Match baseado em padrão fraco. Requer validação manual.',
                     specMatched: matchedSpec,
                     matched_rule_id: activeRule.id,
                     matched_rule_strength: 'WEAK'
                 };
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

        if (matchedSpec.expected_weight_min !== null && barcodeResult.net_weight_lb !== null) {
            if (barcodeResult.net_weight_lb < matchedSpec.expected_weight_min) {
                 return {
                    status: 'ACCEPTED_WITH_WARNING',
                    reason_code: 'WEIGHT_BELOW_SPEC',
                    reference: 'supplier_spec',
                    severity: 'WARNING',
                    details: `Weight (${barcodeResult.net_weight_lb} lb) < MIN (${matchedSpec.expected_weight_min} lb)`,
                    specMatched: matchedSpec,
                    matched_rule_id: activeRule?.id || null,
                    matched_rule_strength: (activeRule?.match_strength as 'STRONG' | 'MEDIUM' | 'WEAK') || null
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
                    matched_rule_id: activeRule?.id || null,
                    matched_rule_strength: (activeRule?.match_strength as 'STRONG' | 'MEDIUM' | 'WEAK') || null
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
            matched_rule_id: activeRule?.id || null,
            matched_rule_strength: (activeRule?.match_strength as 'STRONG' | 'MEDIUM' | 'WEAK') || null
        };
    }
}
