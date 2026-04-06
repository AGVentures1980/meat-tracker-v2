import { ParsedBarcodeResult } from './BarcodeGS1Parser';

export class BarcodeNZParser {
    public static parse(barcode: string): ParsedBarcodeResult {
        const result: ParsedBarcodeResult = {
            raw_barcode: barcode,
            source_parser: 'NZ_PROPRIETARY',
            confidence_score: 0.0,
            gtin: null,
            net_weight_kg: null,
            net_weight_lb: null,
            pack_date: null,
            expiry_date: null,
            serial: null,
            errors: []
        };

        // Template A: Alliance Group (Prefix 992)
        if (barcode.startsWith('992') && barcode.length >= 15) {
            result.source_parser = 'NZ_ALLIANCE';
            result.confidence_score = 0.8;
            
            const weightStr = barcode.slice(-5);
            const value = parseInt(weightStr, 10);
            result.net_weight_kg = value / 100;
            result.net_weight_lb = result.net_weight_kg * 2.20462;
        }
        // Template B: Taylor Preston (Specific Length 22 or Prefix)
        else if (barcode.startsWith('NZ-ME') || barcode.length === 22) {
            result.source_parser = 'NZ_TAYLOR_PRESTON';
            result.confidence_score = 0.8;
            const weightStr = barcode.slice(16, 21); // Mock generic format extraction
            if (weightStr) {
                 const value = parseInt(weightStr, 10);
                 result.net_weight_kg = value / 100;
                 result.net_weight_lb = result.net_weight_kg * 2.20462;
            } else {
                 result.confidence_score = 0.5;
            }
        } 
        else if (barcode.length > 10) {
            result.errors.push('No recognized proprietary NZ pattern matched');
            result.confidence_score = 0.2; 
        }

        // Section 15: Weight Plausibility Check
        if (result.net_weight_lb && (result.net_weight_lb > 160 || result.net_weight_lb < 1)) {
            result.confidence_score = 0.0;
            result.errors.push('Weight Plausibility Failed: Biologically impossible box weight.');
            result.net_weight_lb = null;
            result.net_weight_kg = null;
        }

        return result;
    }
}
