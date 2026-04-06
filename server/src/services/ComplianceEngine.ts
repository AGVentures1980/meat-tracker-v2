import { PrismaClient, CorporateProteinSpec } from '@prisma/client';
import { NormalizedBarcode } from './BarcodeDecisionEngine';

const prisma = new PrismaClient();

export interface ComplianceDecision {
  status: 'ACCEPTED' | 'ACCEPTED_WITH_WARNING' | 'REJECTED';
  reason_code: 'WEIGHT_BELOW_SPEC' | 'WEIGHT_ABOVE_SPEC' | 'YIELD_CRITICAL' | 'UNMAPPED_GTIN' | 'NONE';
  reference: 'supplier_spec' | 'benchmark' | 'baseline';
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  specMatched: CorporateProteinSpec | null;
}

export class ComplianceEngine {
    public static async evaluate(barcodeResult: NormalizedBarcode, companyId: string): Promise<ComplianceDecision> {
        const specs = await prisma.corporateProteinSpec.findMany({
            where: { company_id: companyId }
        });

        let matchedSpec = specs.find(s => s.approved_item_code === barcodeResult.product_code);
        if (!matchedSpec && barcodeResult.raw_barcode) {
             matchedSpec = specs.find(s => s.approved_item_code === barcodeResult.raw_barcode);
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
                    specMatched: matchedSpec
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
                    specMatched: matchedSpec
                 };
            }
        }

        return {
            status: 'ACCEPTED',
            reason_code: 'NONE',
            reference: 'supplier_spec',
            severity: 'INFO',
            details: 'Fully compliant to specification.',
            specMatched: matchedSpec
        };
    }
}
