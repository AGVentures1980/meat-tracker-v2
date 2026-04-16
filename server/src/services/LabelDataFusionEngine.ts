import { PrismaClient, SupplierBarcodeRule } from '@prisma/client';
import { ParsedBarcodeData, FieldProvenance, FusedLabelData } from './BarcodeDecisionEngine';

const prisma = new PrismaClient();

// ==========================================
// 1. OCR ENGINE INTERFACE
// ==========================================
export interface OCRExtractedData {
    weightLb?: { value: number, confidence: number };
    lot?: { value: string, confidence: number };
    serial?: { value: string, confidence: number };
    productText?: { value: string, confidence: number };
}

export abstract class OCRExtractionEngine {
    public static async extract(imageUrl: string, context?: any): Promise<OCRExtractedData> {
        // Mocked implementation for now, returning empty safely.
        return {};
    }
}

// ==========================================
// 2. MULTI-PARSER ENGINE
// ==========================================
export class BarcodeParserRouter {
    public static async parse(rawBarcodes: string[], companyId: string, supplierId?: string | null): Promise<ParsedBarcodeData[]> {
        const results: ParsedBarcodeData[] = [];
        for (const raw of rawBarcodes) {
            let parsed = this.parseGS1(raw);
            if (parsed) {
                if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] Parser: GS1_AI | Status: SUCCESS | GTIN: ${parsed.gtin}`);
            } else {
                if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] Parser: GS1_AI | Status: FAILED`);
                parsed = this.parseEANVariableWeight(raw);
                
                if (parsed) {
                    if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] Parser: EAN_VARIABLE | Status: SUCCESS | Product: ${parsed.product_code} | Weight: ${(parsed as any).weightLb}`);
                } else {
                    if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] Parser: EAN_VARIABLE | Status: FAILED`);
                    parsed = await this.parseSupplierSpecific(raw, companyId, supplierId);
                    
                    if (parsed) {
                        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] Parser: SUPPLIER_RULE | Status: SUCCESS | GTIN: ${parsed.gtin || 'N/A'} | Product: ${parsed.product_code || 'N/A'}`);
                    } else {
                        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] Parser: SUPPLIER_RULE | Status: FAILED`);
                        parsed = this.parseFallback(raw);
                        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] Parser: FALLBACK | Status: SUCCESS`);
                    }
                }
            }
            if (parsed) results.push(parsed);
        }
        return results;
    }

    private static parseGS1(raw: string): ParsedBarcodeData | null {
        if (!raw.includes('01') || raw.length < 20) return null;

        const gtinMatch = raw.match(/01(\d{14})/);
        if (!gtinMatch) return null;

        const gtin = gtinMatch[1];
        let weightLb: number | undefined;
        let productionDate: string | undefined;
        let serial: string | undefined;

        const weightLbMatch = raw.match(/3201(\d{6})|3202(\d{6})/);
        if (weightLbMatch) {
            const raw6 = weightLbMatch[1] || weightLbMatch[2];
            const decimals = weightLbMatch[1] ? 1 : 2;
            weightLb = parseFloat((parseInt(raw6, 10) / Math.pow(10, decimals)).toFixed(2));
        }

        if (weightLb === undefined) {
            const weightKgMatch = raw.match(/3101(\d{6})|3102(\d{6})/);
            if (weightKgMatch) {
                const raw6 = weightKgMatch[1] || weightKgMatch[2];
                const decimals = weightKgMatch[1] ? 1 : 2;
                const weightKg = parseInt(raw6, 10) / Math.pow(10, decimals);
                weightLb = parseFloat((weightKg * 2.20462).toFixed(2));
            }
        }

        const prodDateMatch = raw.match(/11(\d{6})/);
        if (prodDateMatch) {
            productionDate = `20${prodDateMatch[1].substring(0,2)}-${prodDateMatch[1].substring(2,4)}-${prodDateMatch[1].substring(4,6)}`;
        }

        const serialMatch = raw.match(/21([A-Za-z0-9]{1,20})(?:\x1D|$)/);
        if (serialMatch) {
            serial = serialMatch[1];
        }

        return {
            rawBarcodes: [raw],
            gtin,
            // NÃO definir product_code artificialmente ainda
            weightLb,
            productionDate,
            serial,
            symbology: 'GS1_128',
            source_parser: 'GS1_AI'
        } as any;
    }

    private static parseEANVariableWeight(raw: string): ParsedBarcodeData & { weightLb?: number } | null {
        if (raw.length === 13 && (raw.startsWith('20') || raw.startsWith('02'))) {
            const product_code = raw.substring(2, 7);
            const weightRaw = raw.substring(7, 12);
            return {
                rawBarcodes: [raw],
                product_code,
                weightLb: parseInt(weightRaw, 10) / 100, // standard EAN logic assumes last 5 digits convey weight (e.g., 01500 = 15.00)
                symbology: 'EAN13',
                source_parser: 'EAN_VARIABLE'
            };
        }
        return null;
    }

    private static async parseSupplierSpecific(raw: string, companyId: string, supplierId?: string | null): Promise<ParsedBarcodeData | null> {
        const rules = await prisma.supplierBarcodeRule.findMany({
            where: { 
                companyId, 
                isActive: true,
                ...(supplierId ? { supplierId } : {})
            }
        });

        // Try prefix
        const found = rules.find(r => r.matchType === 'PREFIX' && r.rawBarcodePattern && raw.startsWith(r.rawBarcodePattern) && raw.length >= (r.minPrefixLength || 6));
        if (found) {
            return {
                rawBarcodes: [raw],
                gtin: found.gtin || undefined,
                product_code: found.normalizedProductCode || undefined,
                symbology: 'UNKNOWN',
                source_parser: 'SUPPLIER_RULE'
            };
        }
        return null;
    }

    private static parseFallback(raw: string): ParsedBarcodeData {
        return {
            rawBarcodes: [raw],
            symbology: 'UNKNOWN',
            source_parser: 'FALLBACK'
        };
    }
}

// ==========================================
// 3. FUSION & CONFLICT ENGINE
// ==========================================
export class LabelDataFusionEngine {
    
    public static fuse(
        barcodes: ParsedBarcodeData[], 
        ocrData: OCRExtractedData | null, 
        supplierRules: SupplierBarcodeRule[],
        manualOverrides?: any
    ): { fusedData: FusedLabelData, conflicts: string[] } {
        
        const conflicts: string[] = [];

        let fusedData: FusedLabelData = {
            rawBarcodes: barcodes.flatMap(b => b.rawBarcodes),
            productCodeBase: { value: null, source: 'UNKNOWN', confidence: 0 },
            gtin: { value: null, source: 'UNKNOWN', confidence: 0 },
            weightLb: { value: null, source: 'UNKNOWN', confidence: 0 },
        };

        // Pass 1: Parse GS1 High-Confidence Truth
        const gs1Data = barcodes.find(b => b.source_parser === 'GS1_AI');
        if (gs1Data && gs1Data.gtin) {
            fusedData.gtin = { value: gs1Data.gtin || null, source: 'GS1_AI', confidence: 1.0 };
            
            fusedData.productCodeBase = {
                value: (gs1Data as any).product_code || gs1Data.gtin || null,
                source: 'GS1_AI',
                confidence: 1.0
            };
            
            if ((gs1Data as any).weightLb !== undefined) {
                fusedData.weightLb = {
                    value: (gs1Data as any).weightLb,
                    source: 'GS1_AI',
                    confidence: 1.0
                };
            }
            
            if ((gs1Data as any).serial) {
                (fusedData as any).serial = {
                    value: (gs1Data as any).serial,
                    source: 'GS1_AI',
                    confidence: 1.0
                };
            }
            
            if ((gs1Data as any).productionDate) {
                (fusedData as any).productionDate = {
                    value: (gs1Data as any).productionDate,
                    source: 'GS1_AI',
                    confidence: 1.0
                };
            }
        }

        // Pass 2: Merge Barcodes (Supplier Rule or EAN Variable)
        const supplierData = barcodes.find(b => b.source_parser === 'SUPPLIER_RULE');
        if (supplierData) {
            if (fusedData.gtin.confidence < 0.8 && supplierData.gtin) {
                fusedData.gtin = { value: supplierData.gtin, source: 'SUPPLIER_RULE', confidence: 0.9 }; 
            }
            if (fusedData.productCodeBase.confidence < 0.8 && supplierData.product_code) {
                fusedData.productCodeBase = { value: supplierData.product_code, source: 'SUPPLIER_RULE', confidence: 0.9 };
            }
            if (!supplierData.product_code && !supplierData.gtin) {
                 conflicts.push("SUPPLIER_RULE triggered but yielded no GTIN or ProductCode (Blind rule).");
            }
        }

        const eanData = barcodes.find(b => b.source_parser === 'EAN_VARIABLE');
        if (eanData) {
            if (fusedData.productCodeBase.confidence < 0.9) {
                fusedData.productCodeBase = { value: eanData.product_code || null, source: 'EAN_VARIABLE', confidence: 0.8 };
            }
            // EAN weight overrides base confidence given the barcode provides absolute reading truth
            if ((eanData as any).weightLb && fusedData.weightLb.confidence < 0.9) {
                fusedData.weightLb = { value: (eanData as any).weightLb, source: 'EAN_VARIABLE', confidence: 0.95 };
            }
        }

        // Pass 3: Fuse OCR (Fallback to OCR if rules don't exist, log conflicts if rules disagree)
        if (ocrData) {
            // Weight Fusion
            if (ocrData.weightLb && ocrData.weightLb.confidence >= 0.60) {
                // Determine source level
                const ocrSourceLevel = ocrData.weightLb.confidence >= 0.85 ? 'OCR' : 'OCR';
                // Only overwrite if current weight is weak
                if (fusedData.weightLb.confidence < ocrData.weightLb.confidence) {
                    fusedData.weightLb = { value: ocrData.weightLb.value, source: ocrSourceLevel as any, confidence: ocrData.weightLb.confidence };
                } else if (fusedData.weightLb.value && Math.abs(fusedData.weightLb.value - ocrData.weightLb.value) > 0.5) {
                    conflicts.push(`Weight Conflict: System (${fusedData.weightLb.value} lb) vs OCR (${ocrData.weightLb.value} lb)`);
                }
            }

            // Lot Fusion
            if (ocrData.lot && ocrData.lot.confidence >= 0.70) {
                fusedData.lot = { value: ocrData.lot.value, source: 'OCR', confidence: ocrData.lot.confidence };
            }
        }

        // Pass 4: Evaluate overall Product Base Conflict (ConflictDetector)
        if (fusedData.gtin.value && fusedData.productCodeBase.value && fusedData.gtin.value !== fusedData.productCodeBase.value) {
            if (fusedData.productCodeBase.confidence > 0.8 && fusedData.gtin.confidence > 0.8) {
                conflicts.push(`Product Base Conflict: GTIN (${fusedData.gtin.value}) vs LocalCode (${fusedData.productCodeBase.value})`);
            }
        }

        if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
            console.log('[BARCODE TRACE] ================== FUSION ENGINE ==================');
            console.log(`[BARCODE TRACE] FUSED DATA COMPLETO:`, JSON.stringify(fusedData, null, 2));
            console.log(`[BARCODE TRACE] DOMINANT PARSER: GTIN[${fusedData.gtin.source}] | BASE[${fusedData.productCodeBase.source}] | WEIGHT[${fusedData.weightLb.source}]`);
            console.log(`[BARCODE TRACE] FINAL PRODUCT CODE BASE: ${fusedData.productCodeBase.value}`);
            console.log(`[BARCODE TRACE] CONFIDENCE: ${fusedData.productCodeBase.confidence}`);
            const isFallback = fusedData.gtin.source === 'UNKNOWN' && fusedData.productCodeBase.source === 'UNKNOWN' ? 'SIM' : 'NAO';
            console.log(`[BARCODE TRACE] CAIU EM FALLBACK/OCR: ${isFallback}`);
        }

        return { fusedData, conflicts };    
    }
}
