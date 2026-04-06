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

        const parts = barcode.split(' ');
        const mainBarcode = parts[0];
        const extraSerial = parts.length > 1 ? parts.slice(1).join(' ') : null;

        if (extraSerial) {
            result.serial = extraSerial;
        }

        // Template A: Alliance Group (Prefix 992)
        if (mainBarcode.startsWith('992') && mainBarcode.length >= 15) {
            result.source_parser = 'NZ_ALLIANCE';
            result.confidence_score = 0.8;
            
            const weightStr = mainBarcode.slice(-5);
            const value = parseInt(weightStr, 10);
            result.net_weight_kg = value / 100;
            result.net_weight_lb = result.net_weight_kg * 2.20462;
        }
        // Template B: Taylor Preston (Specific Prefix 19065337 or general length 22)
        else if (mainBarcode.startsWith('19065337') && mainBarcode.length >= 22) {
            result.source_parser = 'NZ_TAYLOR_PRESTON';
            result.confidence_score = 0.99;
            
            // Weight is encoded in digits 8-11
            const weightStr = mainBarcode.slice(8, 12);
            const weightVal = parseInt(weightStr, 10);
            if (!isNaN(weightVal)) {
                 result.net_weight_kg = weightVal / 100;
                 result.net_weight_lb = result.net_weight_kg * 2.20462;
            }

            // Date is encoded in digits 17-20 as YDDD (e.g., 5336 = 2025, day 336)
            const dateStr = mainBarcode.slice(17, 21);
            if (dateStr.length === 4) {
                 const yearLastDigit = parseInt(dateStr[0], 10);
                 const dayOfYear = parseInt(dateStr.slice(1), 10);
                 // Assuming 2020s decade
                 const year = 2020 + yearLastDigit;
                 const packDate = new Date(year, 0, dayOfYear);
                 if (!isNaN(packDate.getTime())) {
                     result.pack_date = packDate.toISOString();
                 }
            }
        }
        // Template C: Generic Taylor Preston Legacy
        else if (mainBarcode.startsWith('NZ-ME') || mainBarcode.length === 22) {
            result.source_parser = 'NZ_TAYLOR_PRESTON_GENERIC';
            result.confidence_score = 0.8;
            // Legacy generic extraction logic
            const weightStr = mainBarcode.slice(16, 21);
            if (weightStr && !isNaN(parseInt(weightStr, 10))) {
                 const value = parseInt(weightStr, 10);
                 result.net_weight_kg = value / 100;
                 result.net_weight_lb = result.net_weight_kg * 2.20462;
            } else {
                 result.confidence_score = 0.5;
            }
        } 
        else if (mainBarcode.length > 10) {
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
