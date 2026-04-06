import { normalizeRawBarcode } from './BarcodeNormalizer';
import { BarcodeGS1Parser, ParsedBarcodeResult } from './BarcodeGS1Parser';
import { BarcodeNZParser } from './BarcodeNZParser';

const MEMORY_CACHE = new Map<string, number>();

export class BarcodeDecisionEngineV2 {
    
    // Test helpers ensures clear deterministic TDD state
    public static clearCache() {
        MEMORY_CACHE.clear();
    }
    
    public static forceCacheEntry(storeId: number, context: string, rawBarcode: string, timestampMs: number) {
        const { cleaned_barcode } = normalizeRawBarcode(rawBarcode);
        const duplicateKey = `${storeId}_${context}_${cleaned_barcode}`;
        MEMORY_CACHE.set(duplicateKey, timestampMs);
    }

    public static async evaluate(rawBarcode: string, storeId: number, context: string, sessionId: string): Promise<any> {
        
        // 1. Normalization
        const { cleaned_barcode, is_valid_chars, warnings } = normalizeRawBarcode(rawBarcode);

        // 2. Pre-flight Validation
        if (cleaned_barcode.length < 6 || !is_valid_chars || cleaned_barcode === "") {
            return { raw_barcode: rawBarcode, final_status: 'INVALID', reason_code: 'PREFLIGHT_FAILED', warnings };
        }

        // 3. Sprint 4 - Session Context Lock Constraints
        // Simulates checking if the physical device changed generic view contexts without clearing
        if (context === 'PULL_TO_PREP' && sessionId.includes('RECEIVING')) {
            return { raw_barcode: rawBarcode, final_status: 'INVALID_SESSION', reason_code: 'SESSION_CONTAMINATION_BLOCKED', warnings };
        }

        // 4. Sprint 4 - Flood & Duplication Control (5 seconds)
        const duplicateKey = `${storeId}_${context}_${cleaned_barcode}`;
        const now = Date.now();
        if (MEMORY_CACHE.has(duplicateKey)) {
            const lastScan = MEMORY_CACHE.get(duplicateKey)!;
            if (now - lastScan < 5000) { 
                return { raw_barcode: rawBarcode, final_status: 'DUPLICATE', reason_code: 'DUPLICATE_SCAN_5S' };
            }
        }
        MEMORY_CACHE.set(duplicateKey, now);

        // 5. Multi-Parser Execution (Sprint 2)
        const results: ParsedBarcodeResult[] = [
            BarcodeGS1Parser.parse(cleaned_barcode),
            BarcodeNZParser.parse(cleaned_barcode)
        ];

        // Sort Highest Confidence first
        results.sort((a, b) => b.confidence_score - a.confidence_score);
        
        const best = results[0];
        const runnerUp = results[1];
        let gap = best.confidence_score;
        
        if (runnerUp) {
            gap = best.confidence_score - runnerUp.confidence_score;
        }

        let status = 'UNKNOWN';
        // Sprint 3 Determinism
        if (best.confidence_score < 0.50) {
            status = 'UNKNOWN';
        } else if (gap < 0.10 && runnerUp.confidence_score >= 0.50) {
            // Gap extremely small between two valid templates -> AMBIGUOUS
            status = 'AMBIGUOUS'; 
        } else if (best.confidence_score >= 0.50 && best.confidence_score < 0.85) {
            status = 'LOW_CONFIDENCE_VALID';
        } else {
            status = 'VALID';
        }

        return {
            ...best,
            final_status: status,
            cleaned_barcode,
            runner_up_parser: runnerUp?.source_parser || 'NONE',
            confidence_gap: gap,
            warnings: [...best.errors, ...warnings]
        };
    }
}
