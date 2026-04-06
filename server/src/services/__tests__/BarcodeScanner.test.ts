import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { normalizeRawBarcode } from '../BarcodeNormalizer';
import { BarcodeGS1Parser } from '../BarcodeGS1Parser';
import { BarcodeNZParser } from '../BarcodeNZParser';
import { BarcodeDecisionEngineV2 } from '../BarcodeDecisionEngineV2';

describe('Sprint 1 - Núcleo Seguro (Raw Validation)', () => {
    it('MUST fail empty strings', () => {
        expect(normalizeRawBarcode("").cleaned_barcode).toBe("");
        expect(normalizeRawBarcode("").is_valid_chars).toBe(false);
    });

    it('MUST fail invalid characters (e.g. Emoji, Symbols)', () => {
        const { is_valid_chars } = normalizeRawBarcode("0190123$Garbage");
        expect(is_valid_chars).toBe(false);
    });

    it('MUST strip physical wedge artifacts without invalidating', () => {
        const raw = "\t0190123456789012\r\n";
        const { cleaned_barcode, is_valid_chars } = normalizeRawBarcode(raw);
        expect(cleaned_barcode).toBe("0190123456789012");
        expect(is_valid_chars).toBe(true);
    });
});

describe('Sprint 2 - Parsers GS1 & Templates', () => {
    it('MUST exact match GS1 with Implied Decimals', () => {
        const result = BarcodeGS1Parser.parse("01901234567890123102004550");
        expect(result.net_weight_kg).toBeCloseTo(45.50, 1);
        expect(result.confidence_score).toBe(0.8);
    });

    it('MUST heavily drop score if GTIN structure is mangled', () => {
        const result = BarcodeGS1Parser.parse("01901");
        expect(result.confidence_score).toBe(0);
    });

    it('MUST extract NZ Taylor Preston logic via fallback Template B', () => {
        const result = BarcodeNZParser.parse("NZ-ME123456789004550XX"); // Fake length match
        expect(result.source_parser).toBe('NZ_TAYLOR_PRESTON');
        expect(result.net_weight_kg).toBeCloseTo(45.50, 1);
        expect(result.confidence_score).toBe(0.8);
    });

    it('MUST fail Weight Plausibility for biologically impossible mass', () => {
        const result = BarcodeNZParser.parse("992123456789999"); // Fake massive weight
        expect(result.confidence_score).toBe(0.0);
        expect(result.net_weight_lb).toBeNull();
    });
});

describe('Sprint 3 - Decision Engine & Determinism', () => {
    beforeEach(() => {
        BarcodeDecisionEngineV2.clearCache();
    });

    it('MUST identify deterministical AMBIGUITY', async () => {
        // Manually mocking internal parsers to return artificial colliding scores
        const spyGS1 = jest.spyOn(BarcodeGS1Parser, 'parse').mockReturnValue({ source_parser: 'GS1', confidence_score: 0.85, errors: [], gtin: '1', net_weight_kg: 1, net_weight_lb: 2, raw_barcode: 'x', pack_date: null, expiry_date: null, serial: null });
        const spyNZ = jest.spyOn(BarcodeNZParser, 'parse').mockReturnValue({ source_parser: 'NZ', confidence_score: 0.80, errors: [], gtin: '2', net_weight_kg: 1, net_weight_lb: 2, raw_barcode: 'x', pack_date: null, expiry_date: null, serial: null });
        
        const decision = await BarcodeDecisionEngineV2.evaluate("01992010101010101010", 1, 'RECEIVING', 'session123');
        expect(decision.final_status).toBe('AMBIGUOUS'); // gap is exactly 0.05
        expect(decision.confidence_gap).toBeCloseTo(0.05, 2);
        
        spyGS1.mockRestore();
        spyNZ.mockRestore();
    });

    it('MUST label LOW_CONFIDENCE_VALID', async () => {
        const spyGS1 = jest.spyOn(BarcodeGS1Parser, 'parse').mockReturnValue({ source_parser: 'GS1', confidence_score: 0.75, errors: [], gtin: '1', net_weight_kg: 1, net_weight_lb: 2, raw_barcode: 'x', pack_date: null, expiry_date: null, serial: null });
        const spyNZ = jest.spyOn(BarcodeNZParser, 'parse').mockReturnValue({ source_parser: 'NZ', confidence_score: 0.20, errors: [], gtin: '2', net_weight_kg: 1, net_weight_lb: 2, raw_barcode: 'x', pack_date: null, expiry_date: null, serial: null });
        
        const decision = await BarcodeDecisionEngineV2.evaluate("XYZ123", 1, 'RECEIVING', 'session123');
        expect(decision.final_status).toBe('LOW_CONFIDENCE_VALID');
        
        spyGS1.mockRestore();
        spyNZ.mockRestore();
    });
});

describe('Sprint 4 - Proteção Operacional (Cache, Session, Duplicates)', () => {
    beforeEach(() => {
        BarcodeDecisionEngineV2.clearCache();
    });

    it('MUST identify Duplicate scan inside 5s window', async () => {
        const raw = "992123456708000";
        const first = await BarcodeDecisionEngineV2.evaluate(raw, 1, 'RECEIVING', 'sess1');
        expect(first.final_status).not.toBe('DUPLICATE');

        const second = await BarcodeDecisionEngineV2.evaluate(raw, 1, 'RECEIVING', 'sess1');
        expect(second.final_status).toBe('DUPLICATE');
        expect(second.reason_code).toBe('DUPLICATE_SCAN_5S');
    });

    it('MUST NOT identify Duplicate if out of 5s window (simulate time passing)', async () => {
        const raw = "992123456708000";
        // Force the date inside internal MAP using the test helper
        BarcodeDecisionEngineV2.forceCacheEntry(1, 'RECEIVING', raw, Date.now() - 6000); 
        
        const next = await BarcodeDecisionEngineV2.evaluate(raw, 1, 'RECEIVING', 'sess1');
        expect(next.final_status).not.toBe('DUPLICATE');
    });

    it('MUST reject cross-contamination of Scan Session', async () => {
        // User moves physically from Receiving to Prep without clearing session
        const raw = "123456789";
        const result = await BarcodeDecisionEngineV2.evaluate(raw, 1, 'PULL_TO_PREP', 'sess1_RECEIVING_LOCKED');
        expect(result.final_status).toBe('INVALID_SESSION');
    });
});
