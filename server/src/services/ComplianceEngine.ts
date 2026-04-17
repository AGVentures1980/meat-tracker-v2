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
  decisionPath?: string;
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
                 specMatched: null,
                 decisionPath: 'PRE_FLIGHT_CONFLICT'
            };
        }

        const fallbackRawBarcode = fusedData.rawBarcodes.length > 0 ? fusedData.rawBarcodes[0] : null;

        let traceMethod = 'CORPORATE_SPEC';
        let traceField = 'N/A';

        // --- PHASE 1: CANONICAL ECOSYSTEM RESOLUTION (V1 ZERO-TRUST + V2 IDENTITY LEVELS) ---
        const { CanonicalIdentityGenerator } = await import('./CanonicalIdentityGenerator');
        const { BarcodeIdentityResolver } = await import('./identities/BarcodeIdentityResolver');

        const parsedMock = {
            rawBarcodes: fusedData.rawBarcodes,
            gtin: fusedData.gtin.value || undefined,
            product_code: (fusedData.productCodeBase.source === 'GS1_AI' ? undefined : fusedData.productCodeBase.value) || undefined,
            serial: fusedData.serial?.value || undefined,
            symbology: 'UNKNOWN',
            source_parser: fusedData.gtin.source === 'GS1_AI' ? 'GS1_AI' : 'EAN_VARIABLE'
        };

        const canonicalCandidate = CanonicalIdentityGenerator.generate(parsedMock as any, supplierId);
        const resolvedCanonical = await BarcodeIdentityResolver.resolve(canonicalCandidate, companyId);
        
        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
            console.log(`[EXECUTION DEBUG - ComplianceEngine (Phase 1)]`);
            console.log(` -> Identity Level: ${canonicalCandidate.identityLevel}`);
            console.log(` -> Tentou Alias (Family)? ${resolvedCanonical.matchType === 'ALIAS_MAPPED' ? 'Sim (Encontrado)' : 'Sim (Não Encontrado)'}`);
            console.log(` -> CorporateSpec vinculado? ${resolvedCanonical.corporateSpec ? 'Sim (ID: ' + resolvedCanonical.corporateSpec.id + ')' : 'Não'}`);
            if (!resolvedCanonical.corporateSpec) {
                console.log(` -> Caiu no Fallback Legado? Sim, pois o ecossistema canônico não amarrou o Spec.`);
            }
            console.log('\n');
        }

        let canonicalIdentityId = resolvedCanonical.canonicalIdentity?.id;

        if (resolvedCanonical.corporateSpec) {
             matchedSpec = resolvedCanonical.corporateSpec;
             activeRuleType = 'LegacyRule'; // Emulated to bypass below block cleanly
             if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
                 console.log(`[BARCODE TRACE] CANONICAL RESOLUTION HIT! Type: ${resolvedCanonical.matchType} -> Family: ${resolvedCanonical.operationalFamily?.family_name}`);
             }
        }

        // --- PHASE 2: LEGACY FALLBACK (Only if Canonical failed) ---
        if (!matchedSpec) {

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
                     supplierId: activeRuleType === 'SupplierRule' ? (activeRule as any).supplierId : null,
                     decisionPath: 'WEAK_RULE_TRIGGERED'
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
            // Fallback Legacy Flow: Match contra productCodeBase primeiro
            const specs = await prisma.corporateProteinSpec.findMany({
                where: { company_id: companyId }
            });

            if (fusedData.productCodeBase.value) {
                matchedSpec = specs.find(s => s.approved_item_code === fusedData.productCodeBase.value);
            }
            
            // Ultra Low Priority: Fallback para Exact Match Cru via fallbackRawBarcode
            if (!matchedSpec && fallbackRawBarcode) {
                matchedSpec = specs.find(s => s.approved_item_code === fallbackRawBarcode);
                if (matchedSpec && process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
                    console.warn(`[BARCODE TRACE] CRÈDITO EXPERIMENTAL (LOW-PRIORITY): Exact Match Legacy Fallback Triggered via barcode cru para ${matchedSpec.protein_name}`);
                }
            }
        }



        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
            if (activeRule) {
                 traceMethod = activeRuleType === 'SupplierRule' ? 'SUPPLIER_RULE' : 
                               activeRuleType === 'LegacyRule' ? 'RECEIVING_RULE' : 'UNKNOWN';
                 if (activeRuleType === 'SupplierRule') {
                     if ((activeRule as any).matchType === 'GTIN') traceField = 'gtin';
                     else if ((activeRule as any).matchType === 'PRODUCT_CODE') traceField = 'productCodeBase';
                     else traceField = 'rawBarcode';
                 } else {
                     traceField = (activeRule as any).match_strength === 'WEAK' ? 'rawBarcode' : ((activeRule as any).gtin ? 'gtin' : 'productCodeBase');
                 }
            } else if (matchedSpec) {
                 if (matchedSpec.approved_item_code === fusedData.productCodeBase.value) {
                      traceField = 'productCodeBase';
                      traceMethod = 'CORPORATE_SPEC';
                 } else {
                      traceField = 'rawBarcode';
                      traceMethod = 'LEGACY_FALLBACK';
                 }
            }
            
            console.log('[BARCODE TRACE] ================== COMPLIANCE ENGINE ==================');
            console.log(`[BARCODE TRACE] METODO VENCEDOR: ${traceMethod}`);
            console.log(`[BARCODE TRACE] CAMPO QUE BATEU: ${traceField}`);
            if (traceMethod === 'LEGACY_FALLBACK') {
                 console.log(`[BARCODE TRACE] [WARNING] LEGACY FALLBACK ACTIVATED`);
            }
        }
        } // End of Legacy Fallback Wrapper

        if (!matchedSpec) {
            // Write to Mapping Review Queue internally
            if (canonicalCandidate) {
                try {
                    await prisma.mappingReviewQueue.create({
                        data: {
                            raw_barcode: fallbackRawBarcode || 'UNKNOWN',
                            canonical_identity_candidate_id: canonicalIdentityId || null,
                            reason_code: 'UNMAPPED_GTIN',
                            review_status: 'PENDING',
                            company_id: companyId
                        }
                    });

                    if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
                        console.log(`[EXECUTION DEBUG - MappingReviewQueue]`);
                        console.log(` -> Barcode Bloqueado: ${fallbackRawBarcode}`);
                        console.log(` -> Family Signature: ${canonicalCandidate.familyStableSignature || 'NULL'}`);
                        console.log(` -> Item Signature: ${canonicalCandidate.itemStableSignature}`);
                        console.log(` -> Motivo do bloqueio: UNMAPPED_GTIN (Fila de Revisão)\n`);
                    }

                } catch (e) {
                    console.error('[BARCODE TRACE] Failed to write into MappingReviewQueue', e);
                }
            }

            return {
                status: 'REJECTED',
                reason_code: 'UNMAPPED_GTIN',
                reference: 'supplier_spec',
                severity: 'CRITICAL',
                details: 'No matching CorporateProteinSpec found in system. Queued for Review.',
                specMatched: null,
                decisionPath: 'UNMAPPED_NO_SPEC'
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
                    supplierId: resolvedSupplierId,
                    decisionPath: `${traceMethod} -> ${traceField}`
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
                    supplierId: resolvedSupplierId,
                    decisionPath: `${traceMethod} -> ${traceField}`
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
                supplierId: resolvedSupplierId,
                decisionPath: `${traceMethod} -> ${traceField}`
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
