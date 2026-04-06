import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NormalizedBarcode {
    raw_barcode: string;
    barcode_family: string;
    barcode_type: string;
    confidence_score: number;
    product_code: string;
    product_name: string;
    gtin: string | null;
    net_weight_lb: number | null;
    net_weight_kg: number | null;
    unit: string;
    lot: string | null;
    pack_date: Date | null;
    expiry_date: Date | null;
    serial: string | null;
    status: 'valid' | 'invalid' | 'unknown';
    warnings: string[];
    source_parser: string;
}

export class BarcodeDecisionEngine {
    
    public static async parse(barcode: string, storeId: number): Promise<NormalizedBarcode> {
        const parsers = [
            { name: "GS1", func: this.parseGS1 },
            { name: "NZ-PROP", func: this.parseNZProprietary },    
            { name: "SERIAL", func: this.parseSerial }
        ];

        let bestMatch: NormalizedBarcode | null = null;
        let secondBestScore = 0;
        const attempted: string[] = [];
        const scores: number[] = [];

        for (const parser of parsers) {
            const result = parser.func.call(this, barcode);
            attempted.push(parser.name);
            scores.push(result.confidence_score);

            if (bestMatch === null) {
                 bestMatch = result;
            } else if (result.confidence_score > bestMatch.confidence_score) {
                 secondBestScore = bestMatch.confidence_score;
                 bestMatch = result;
            } else if (result.confidence_score > secondBestScore) {
                 secondBestScore = result.confidence_score;
            }
        }

        const confidenceGap = bestMatch!.confidence_score - secondBestScore;

        if (bestMatch!.confidence_score < 0.3) {
            await prisma.barcodeDecisionLog.create({
                data: {
                     store_id: storeId,
                     raw_barcode: barcode,
                     attempted_parsers: attempted,
                     scores: scores,
                     selected_parser: 'UNKNOWN',
                     confidence_gap: 0
                }
            });
            return { raw_barcode: barcode, barcode_family: 'UNKNOWN', barcode_type: 'UNKNOWN', confidence_score: 0, product_code: '', product_name: '', gtin: null, net_weight_lb: null, net_weight_kg: null, unit: 'LB', lot: null, pack_date: null, expiry_date: null, serial: null, status: 'unknown', warnings: ['No suitable parser found.'], source_parser: 'NONE' };
        }

        await prisma.barcodeDecisionLog.create({
            data: {
                 store_id: storeId,
                 raw_barcode: barcode,
                 attempted_parsers: attempted,
                 scores: scores,
                 selected_parser: bestMatch!.source_parser,
                 confidence_gap: confidenceGap
            }
        });

        return bestMatch!;
    }

    private static parseGS1(barcode: string): NormalizedBarcode {
        let confidence = 0;
        let gtin: string | null = null;
        let weight: number | null = null;
        if (barcode.includes('01') && barcode.length > 20) {
            confidence += 0.4; 
            const gtinMatch = barcode.match(/01(\d{14})/);
            if (gtinMatch) { gtin = gtinMatch[1]; confidence += 0.3; }
            const weightMatch = barcode.match(/3102(\d{6})/);
            if (weightMatch) { weight = parseInt(weightMatch[1], 10) / 100; confidence += 0.2; }
        }
        return { raw_barcode: barcode, barcode_family: confidence > 0.5 ? 'GS1-128' : 'UNKNOWN', barcode_type: 'STANDARD', confidence_score: confidence, product_code: gtin || '', product_name: '', gtin: gtin, net_weight_lb: weight, net_weight_kg: weight ? weight * 0.453592 : null, unit: 'LB', lot: null, pack_date: null, expiry_date: null, serial: null, status: confidence >= 0.7 ? 'valid' : 'invalid', warnings: [], source_parser: 'GS1' };
    }

    private static parseNZProprietary(barcode: string): NormalizedBarcode {
        let confidence = 0;
        if (barcode.startsWith('NZ-ME') || barcode.length === 22) confidence = 0.8;
        return { raw_barcode: barcode, barcode_family: confidence > 0.5 ? 'NZ-PROPRIETARY' : 'UNKNOWN', barcode_type: 'PROPRIETARY', confidence_score: confidence, product_code: barcode, product_name: '', gtin: barcode.startsWith('NZ-ME') ? barcode : null, net_weight_lb: null, net_weight_kg: null, unit: 'LB', lot: null, pack_date: null, expiry_date: null, serial: null, status: 'valid', warnings: [], source_parser: 'NZ-PROP' };
    }
    
    private static parseSerial(barcode: string): NormalizedBarcode {
        let confidence = 0.1;
        if (barcode.length < 10) confidence = 0.6; 
        return { raw_barcode: barcode, barcode_family: 'SERIAL', barcode_type: 'INTERNAL', confidence_score: confidence, product_code: barcode, product_name: '', gtin: null, net_weight_lb: null, net_weight_kg: null, unit: 'LB', lot: null, pack_date: null, expiry_date: null, serial: barcode, status: 'valid', warnings: [], source_parser: 'SERIAL' };
    }
}
