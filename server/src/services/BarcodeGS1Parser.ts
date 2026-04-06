export interface ParsedBarcodeResult {
    raw_barcode: string;
    source_parser: string;
    confidence_score: number;
    gtin: string | null;
    net_weight_kg: number | null;
    net_weight_lb: number | null;
    pack_date: string | null;
    expiry_date: string | null;
    serial: string | null;
    errors: string[];
}

export class BarcodeGS1Parser {
    public static parse(barcode: string): ParsedBarcodeResult {
        const result: ParsedBarcodeResult = {
            raw_barcode: barcode,
            source_parser: 'GS1_STRICT',
            confidence_score: 0.0,
            gtin: null,
            net_weight_kg: null,
            net_weight_lb: null,
            pack_date: null,
            expiry_date: null,
            serial: null,
            errors: []
        };

        const gtinMatch = barcode.match(/(?:\(01\)|01)(\d{14})/);
        if (gtinMatch) {
            result.gtin = gtinMatch[1];
            result.confidence_score += 0.5;
        } else {
             result.errors.push('Missing or invalid GTIN (01) grouping');
        }

        const kgWeightMatch = barcode.match(/(?:\(310\d\)|310(\d))(\d{6})/);
        if (kgWeightMatch) {
            const decimals = parseInt(kgWeightMatch[1], 10);
            const value = parseInt(kgWeightMatch[2], 10);
            result.net_weight_kg = value / Math.pow(10, decimals);
            result.net_weight_lb = result.net_weight_kg * 2.20462;
            result.confidence_score += 0.3;
        }

        const lbWeightMatch = barcode.match(/(?:\(320\d\)|320(\d))(\d{6})/);
        if (lbWeightMatch && !result.net_weight_lb) {
            const decimals = parseInt(lbWeightMatch[1], 10);
            const value = parseInt(lbWeightMatch[2], 10);
            result.net_weight_lb = value / Math.pow(10, decimals);
            result.net_weight_kg = result.net_weight_lb / 2.20462;
            result.confidence_score += 0.3;
        }

        if (!gtinMatch && !kgWeightMatch && !lbWeightMatch) {
             result.confidence_score = 0.0;
             result.errors.push('No recognized GS1 patterns found');
        }

        return result;
    }
}
